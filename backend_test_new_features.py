#!/usr/bin/env python3
"""
TrendyPrompt Backend API Test Suite - NEW FEATURES
Tests for videoUrl, trending fields, /api/settings endpoint, and auto-seed idempotency
"""

import requests
import json
import sys
import time
from typing import Dict, Any

# Configuration
BASE_URL = "https://prompt-gallery-91.preview.emergentagent.com/api"
ADMIN_PASSWORD = "trendyprompt2025"

# Test state
admin_token = None
test_prompt_id = None
test_results = {
    "passed": 0,
    "failed": 0,
    "tests": []
}

def log_test(name: str, passed: bool, message: str = ""):
    """Log test result"""
    status = "✅ PASS" if passed else "❌ FAIL"
    print(f"{status}: {name}")
    if message:
        print(f"   {message}")
    test_results["tests"].append({
        "name": name,
        "passed": passed,
        "message": message
    })
    if passed:
        test_results["passed"] += 1
    else:
        test_results["failed"] += 1

def get_admin_token():
    """Get admin token for authenticated requests"""
    global admin_token
    if admin_token:
        return admin_token
    
    try:
        response = requests.post(
            f"{BASE_URL}/admin/login",
            json={"password": ADMIN_PASSWORD},
            timeout=10
        )
        if response.status_code == 200:
            data = response.json()
            admin_token = data.get("token")
            print(f"✓ Admin token obtained: {admin_token[:20]}...")
            return admin_token
        else:
            print(f"✗ Failed to get admin token: {response.status_code}")
            return None
    except Exception as e:
        print(f"✗ Exception getting admin token: {str(e)}")
        return None

def test_create_prompt_with_video_url_and_trending():
    """Test A1: POST /api/prompts with videoUrl and trending fields"""
    print("\n=== Test A1: Create prompt with videoUrl and trending ===")
    global test_prompt_id
    
    try:
        token = get_admin_token()
        if not token:
            log_test("Create prompt with videoUrl and trending", False, "Failed to get admin token")
            return
        
        headers = {"Authorization": f"Bearer {token}"}
        payload = {
            "title": "Test Video Prompt",
            "prompt": "Test video prompt content",
            "type": "video",
            "videoUrl": "https://example.com/v.mp4",
            "trending": True,
            "tools": ["Veo"],
            "thumbnail": "",
            "instructions": ["Step 1"],
            "toolLinks": []
        }
        
        response = requests.post(
            f"{BASE_URL}/prompts",
            json=payload,
            headers=headers,
            timeout=10
        )
        
        if response.status_code != 200:
            log_test("Create prompt with videoUrl and trending", False, 
                    f"Expected 200, got {response.status_code}: {response.text}")
            return
        
        data = response.json()
        
        # Verify videoUrl is present and correct
        if "videoUrl" not in data:
            log_test("Create prompt with videoUrl and trending", False, "Response missing 'videoUrl' field")
            return
        
        if data["videoUrl"] != "https://example.com/v.mp4":
            log_test("Create prompt with videoUrl and trending", False, 
                    f"videoUrl mismatch: expected 'https://example.com/v.mp4', got '{data['videoUrl']}'")
            return
        
        # Verify trending is present and correct
        if "trending" not in data:
            log_test("Create prompt with videoUrl and trending", False, "Response missing 'trending' field")
            return
        
        if data["trending"] != True:
            log_test("Create prompt with videoUrl and trending", False, 
                    f"trending mismatch: expected True, got {data['trending']}")
            return
        
        # Store the test prompt ID for later tests
        test_prompt_id = data.get("id")
        
        log_test("Create prompt with videoUrl and trending", True, 
                f"Created prompt with videoUrl and trending=true (ID: {test_prompt_id})")
        
    except Exception as e:
        log_test("Create prompt with videoUrl and trending", False, f"Exception: {str(e)}")

def test_get_trending_prompts():
    """Test A2: GET /api/prompts?trending=1 returns only trending prompts"""
    print("\n=== Test A2: GET trending prompts ===")
    
    try:
        response = requests.get(f"{BASE_URL}/prompts?trending=1", timeout=10)
        
        if response.status_code != 200:
            log_test("GET trending prompts", False, f"Expected 200, got {response.status_code}")
            return
        
        data = response.json()
        
        if "items" not in data:
            log_test("GET trending prompts", False, "Response missing 'items' field")
            return
        
        items = data["items"]
        
        # Should have at least 5 trending prompts (4 seeded + 1 test)
        if len(items) < 5:
            log_test("GET trending prompts", False, 
                    f"Expected at least 5 trending prompts (4 seeded + 1 test), got {len(items)}")
            return
        
        # Verify all returned prompts have trending=true
        non_trending = [item for item in items if not item.get("trending")]
        if non_trending:
            log_test("GET trending prompts", False, 
                    f"Found {len(non_trending)} non-trending prompts in trending filter results")
            return
        
        # Verify our test prompt is in the results
        test_prompt_found = any(item.get("id") == test_prompt_id for item in items)
        if not test_prompt_found:
            log_test("GET trending prompts", False, "Test prompt not found in trending results")
            return
        
        log_test("GET trending prompts", True, 
                f"Found {len(items)} trending prompts, all have trending=true")
        
    except Exception as e:
        log_test("GET trending prompts", False, f"Exception: {str(e)}")

def test_update_prompt_trending_and_video_url():
    """Test A3: PUT /api/prompts/:id with trending=false and new videoUrl"""
    print("\n=== Test A3: Update prompt trending and videoUrl ===")
    
    try:
        if not test_prompt_id:
            log_test("Update prompt trending and videoUrl", False, "No test prompt ID available")
            return
        
        token = get_admin_token()
        if not token:
            log_test("Update prompt trending and videoUrl", False, "Failed to get admin token")
            return
        
        headers = {"Authorization": f"Bearer {token}"}
        payload = {
            "trending": False,
            "videoUrl": "https://newurl.com/x.mp4"
        }
        
        response = requests.put(
            f"{BASE_URL}/prompts/{test_prompt_id}",
            json=payload,
            headers=headers,
            timeout=10
        )
        
        if response.status_code != 200:
            log_test("Update prompt trending and videoUrl", False, 
                    f"Expected 200, got {response.status_code}: {response.text}")
            return
        
        data = response.json()
        
        # Verify trending is now false
        if data.get("trending") != False:
            log_test("Update prompt trending and videoUrl", False, 
                    f"trending not updated: expected False, got {data.get('trending')}")
            return
        
        # Verify videoUrl is updated
        if data.get("videoUrl") != "https://newurl.com/x.mp4":
            log_test("Update prompt trending and videoUrl", False, 
                    f"videoUrl not updated: expected 'https://newurl.com/x.mp4', got '{data.get('videoUrl')}'")
            return
        
        # Now GET the prompt to verify persistence
        get_response = requests.get(f"{BASE_URL}/prompts/{test_prompt_id}", timeout=10)
        
        if get_response.status_code != 200:
            log_test("Update prompt trending and videoUrl", False, 
                    f"GET after update failed: {get_response.status_code}")
            return
        
        get_data = get_response.json()
        
        if get_data.get("trending") != False:
            log_test("Update prompt trending and videoUrl", False, 
                    f"trending not persisted: expected False, got {get_data.get('trending')}")
            return
        
        if get_data.get("videoUrl") != "https://newurl.com/x.mp4":
            log_test("Update prompt trending and videoUrl", False, 
                    f"videoUrl not persisted: expected 'https://newurl.com/x.mp4', got '{get_data.get('videoUrl')}'")
            return
        
        log_test("Update prompt trending and videoUrl", True, 
                "Successfully updated and persisted trending=false and new videoUrl")
        
    except Exception as e:
        log_test("Update prompt trending and videoUrl", False, f"Exception: {str(e)}")

def test_get_settings_no_auth():
    """Test B5: GET /api/settings (no auth) returns settings object"""
    print("\n=== Test B5: GET /api/settings (no auth) ===")
    
    try:
        response = requests.get(f"{BASE_URL}/settings", timeout=10)
        
        if response.status_code != 200:
            log_test("GET settings (no auth)", False, f"Expected 200, got {response.status_code}")
            return
        
        data = response.json()
        
        # Verify required fields are present
        required_fields = ["whatsapp", "telegram", "instagram", "youtube", "twitter", "tagline"]
        missing_fields = [f for f in required_fields if f not in data]
        
        if missing_fields:
            log_test("GET settings (no auth)", False, f"Missing fields: {missing_fields}")
            return
        
        # Verify MongoDB _id is NOT included
        if "_id" in data:
            log_test("GET settings (no auth)", False, "Response should not include MongoDB _id field")
            return
        
        log_test("GET settings (no auth)", True, 
                f"Successfully retrieved settings with all required fields (no _id)")
        
    except Exception as e:
        log_test("GET settings (no auth)", False, f"Exception: {str(e)}")

def test_put_settings_no_auth():
    """Test B6: PUT /api/settings without Authorization header returns 401"""
    print("\n=== Test B6: PUT /api/settings (no auth) ===")
    
    try:
        payload = {"whatsapp": "https://wa.me/123"}
        
        response = requests.put(
            f"{BASE_URL}/settings",
            json=payload,
            timeout=10
        )
        
        if response.status_code != 401:
            log_test("PUT settings (no auth)", False, 
                    f"Expected 401, got {response.status_code}")
            return
        
        log_test("PUT settings (no auth)", True, "Correctly returned 401 without auth")
        
    except Exception as e:
        log_test("PUT settings (no auth)", False, f"Exception: {str(e)}")

def test_put_settings_with_auth():
    """Test B7: PUT /api/settings with admin Bearer token"""
    print("\n=== Test B7: PUT /api/settings (with auth) ===")
    
    try:
        token = get_admin_token()
        if not token:
            log_test("PUT settings (with auth)", False, "Failed to get admin token")
            return
        
        headers = {"Authorization": f"Bearer {token}"}
        payload = {
            "whatsapp": "https://wa.me/123",
            "telegram": "https://t.me/x",
            "instagram": "https://instagram.com/y",
            "youtube": "https://youtube.com/@z",
            "twitter": "https://x.com/q",
            "tagline": "Daily AI vibes"
        }
        
        response = requests.put(
            f"{BASE_URL}/settings",
            json=payload,
            headers=headers,
            timeout=10
        )
        
        if response.status_code != 200:
            log_test("PUT settings (with auth)", False, 
                    f"Expected 200, got {response.status_code}: {response.text}")
            return
        
        data = response.json()
        
        # Verify all fields are returned correctly
        for key, value in payload.items():
            if data.get(key) != value:
                log_test("PUT settings (with auth)", False, 
                        f"Field '{key}' mismatch: expected '{value}', got '{data.get(key)}'")
                return
        
        log_test("PUT settings (with auth)", True, "Successfully updated all settings fields")
        
    except Exception as e:
        log_test("PUT settings (with auth)", False, f"Exception: {str(e)}")

def test_get_settings_after_update():
    """Test B8: GET /api/settings (no auth) after update verifies persistence"""
    print("\n=== Test B8: GET /api/settings after update ===")
    
    try:
        response = requests.get(f"{BASE_URL}/settings", timeout=10)
        
        if response.status_code != 200:
            log_test("GET settings after update", False, f"Expected 200, got {response.status_code}")
            return
        
        data = response.json()
        
        # Verify the values we set in the previous test
        expected_values = {
            "whatsapp": "https://wa.me/123",
            "telegram": "https://t.me/x",
            "instagram": "https://instagram.com/y",
            "youtube": "https://youtube.com/@z",
            "twitter": "https://x.com/q",
            "tagline": "Daily AI vibes"
        }
        
        for key, expected_value in expected_values.items():
            if data.get(key) != expected_value:
                log_test("GET settings after update", False, 
                        f"Field '{key}' not persisted: expected '{expected_value}', got '{data.get(key)}'")
                return
        
        log_test("GET settings after update", True, "All settings fields persisted correctly")
        
    except Exception as e:
        log_test("GET settings after update", False, f"Exception: {str(e)}")

def test_put_settings_ignores_unknown_fields():
    """Test B9: PUT /api/settings with arbitrary unknown field"""
    print("\n=== Test B9: PUT /api/settings ignores unknown fields ===")
    
    try:
        token = get_admin_token()
        if not token:
            log_test("PUT settings ignores unknown fields", False, "Failed to get admin token")
            return
        
        headers = {"Authorization": f"Bearer {token}"}
        payload = {
            "hacker": "evil",
            "whatsapp": "https://updated.com"
        }
        
        response = requests.put(
            f"{BASE_URL}/settings",
            json=payload,
            headers=headers,
            timeout=10
        )
        
        if response.status_code != 200:
            log_test("PUT settings ignores unknown fields", False, 
                    f"Expected 200, got {response.status_code}: {response.text}")
            return
        
        data = response.json()
        
        # Verify whatsapp was updated
        if data.get("whatsapp") != "https://updated.com":
            log_test("PUT settings ignores unknown fields", False, 
                    f"whatsapp not updated: expected 'https://updated.com', got '{data.get('whatsapp')}'")
            return
        
        # Verify "hacker" field is NOT in response
        if "hacker" in data:
            log_test("PUT settings ignores unknown fields", False, 
                    "Unknown field 'hacker' should not appear in response")
            return
        
        log_test("PUT settings ignores unknown fields", True, 
                "Only whatsapp updated, unknown field 'hacker' ignored")
        
    except Exception as e:
        log_test("PUT settings ignores unknown fields", False, f"Exception: {str(e)}")

def test_put_settings_clear_tagline():
    """Test B10: PUT /api/settings with empty tagline"""
    print("\n=== Test B10: PUT /api/settings clear tagline ===")
    
    try:
        token = get_admin_token()
        if not token:
            log_test("PUT settings clear tagline", False, "Failed to get admin token")
            return
        
        headers = {"Authorization": f"Bearer {token}"}
        payload = {"tagline": ""}
        
        response = requests.put(
            f"{BASE_URL}/settings",
            json=payload,
            headers=headers,
            timeout=10
        )
        
        if response.status_code != 200:
            log_test("PUT settings clear tagline", False, 
                    f"Expected 200, got {response.status_code}: {response.text}")
            return
        
        data = response.json()
        
        # Verify tagline is empty string
        if data.get("tagline") != "":
            log_test("PUT settings clear tagline", False, 
                    f"tagline not cleared: expected '', got '{data.get('tagline')}'")
            return
        
        log_test("PUT settings clear tagline", True, "Successfully cleared tagline to empty string")
        
    except Exception as e:
        log_test("PUT settings clear tagline", False, f"Exception: {str(e)}")

def test_auto_seed_idempotency():
    """Test C11: Auto-seed idempotency - multiple GET requests should not duplicate"""
    print("\n=== Test C11: Auto-seed idempotency ===")
    
    try:
        # Get initial count
        response1 = requests.get(f"{BASE_URL}/prompts", timeout=10)
        if response1.status_code != 200:
            log_test("Auto-seed idempotency", False, f"First GET failed: {response1.status_code}")
            return
        
        data1 = response1.json()
        initial_count = len(data1.get("items", []))
        
        # Make 5 more requests in quick succession
        counts = [initial_count]
        for i in range(5):
            response = requests.get(f"{BASE_URL}/prompts", timeout=10)
            if response.status_code != 200:
                log_test("Auto-seed idempotency", False, 
                        f"GET request {i+2} failed: {response.status_code}")
                return
            data = response.json()
            count = len(data.get("items", []))
            counts.append(count)
            time.sleep(0.1)  # Small delay between requests
        
        # Verify all counts are the same (no duplicates created)
        if len(set(counts)) != 1:
            log_test("Auto-seed idempotency", False, 
                    f"Count changed across requests: {counts} (duplicates created)")
            return
        
        log_test("Auto-seed idempotency", True, 
                f"Count remained stable at {initial_count} across 6 requests (no duplicates)")
        
    except Exception as e:
        log_test("Auto-seed idempotency", False, f"Exception: {str(e)}")

def test_delete_test_prompt():
    """Test A4: DELETE the test prompt to clean up"""
    print("\n=== Test A4: Delete test prompt (cleanup) ===")
    
    try:
        if not test_prompt_id:
            log_test("Delete test prompt", False, "No test prompt ID available")
            return
        
        token = get_admin_token()
        if not token:
            log_test("Delete test prompt", False, "Failed to get admin token")
            return
        
        headers = {"Authorization": f"Bearer {token}"}
        
        response = requests.delete(
            f"{BASE_URL}/prompts/{test_prompt_id}",
            headers=headers,
            timeout=10
        )
        
        if response.status_code != 200:
            log_test("Delete test prompt", False, 
                    f"Expected 200, got {response.status_code}: {response.text}")
            return
        
        data = response.json()
        
        if not data.get("ok"):
            log_test("Delete test prompt", False, "Response did not include ok:true")
            return
        
        log_test("Delete test prompt", True, f"Successfully deleted test prompt {test_prompt_id}")
        
    except Exception as e:
        log_test("Delete test prompt", False, f"Exception: {str(e)}")

def print_summary():
    """Print test summary"""
    print("\n" + "="*60)
    print("TEST SUMMARY - NEW FEATURES")
    print("="*60)
    print(f"Total Tests: {test_results['passed'] + test_results['failed']}")
    print(f"✅ Passed: {test_results['passed']}")
    print(f"❌ Failed: {test_results['failed']}")
    print("="*60)
    
    if test_results['failed'] > 0:
        print("\nFailed Tests:")
        for test in test_results['tests']:
            if not test['passed']:
                print(f"  ❌ {test['name']}: {test['message']}")
    
    return test_results['failed'] == 0

def main():
    """Run all new feature tests"""
    print("="*60)
    print("TrendyPrompt Backend API - NEW FEATURES TEST SUITE")
    print("="*60)
    print(f"Base URL: {BASE_URL}")
    print(f"Admin Password: {ADMIN_PASSWORD}")
    print("="*60)
    
    # Run tests in order
    test_create_prompt_with_video_url_and_trending()  # A1
    test_get_trending_prompts()                        # A2
    test_update_prompt_trending_and_video_url()        # A3
    test_get_settings_no_auth()                        # B5
    test_put_settings_no_auth()                        # B6
    test_put_settings_with_auth()                      # B7
    test_get_settings_after_update()                   # B8
    test_put_settings_ignores_unknown_fields()         # B9
    test_put_settings_clear_tagline()                  # B10
    test_auto_seed_idempotency()                       # C11
    test_delete_test_prompt()                          # A4 (cleanup)
    
    # Print summary
    all_passed = print_summary()
    
    # Exit with appropriate code
    sys.exit(0 if all_passed else 1)

if __name__ == "__main__":
    main()
