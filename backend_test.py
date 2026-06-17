#!/usr/bin/env python3
"""
TrendyPrompt Backend API Test Suite
Tests all backend endpoints for the TrendyPrompt application
"""

import requests
import json
import sys
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

def test_auto_seed_prompts():
    """Test 1: Auto-seed prompts on first GET"""
    print("\n=== Test 1: Auto-seed prompts on first GET ===")
    try:
        response = requests.get(f"{BASE_URL}/prompts", timeout=10)
        
        if response.status_code != 200:
            log_test("Auto-seed prompts", False, f"Expected 200, got {response.status_code}")
            return
        
        data = response.json()
        
        if "items" not in data:
            log_test("Auto-seed prompts", False, "Response missing 'items' field")
            return
        
        items = data["items"]
        
        if len(items) < 8:
            log_test("Auto-seed prompts", False, f"Expected at least 8 seeded prompts, got {len(items)}")
            return
        
        # Verify structure of first item
        first_item = items[0]
        required_fields = ["id", "title", "type", "tools", "thumbnail", "prompt", 
                          "instructions", "toolLinks", "published", "createdAt"]
        
        missing_fields = [f for f in required_fields if f not in first_item]
        if missing_fields:
            log_test("Auto-seed prompts", False, f"Missing fields: {missing_fields}")
            return
        
        # Verify tools is an array
        if not isinstance(first_item["tools"], list):
            log_test("Auto-seed prompts", False, "tools field is not an array")
            return
        
        # Verify instructions is an array
        if not isinstance(first_item["instructions"], list):
            log_test("Auto-seed prompts", False, "instructions field is not an array")
            return
        
        # Verify toolLinks is an array
        if not isinstance(first_item["toolLinks"], list):
            log_test("Auto-seed prompts", False, "toolLinks field is not an array")
            return
        
        log_test("Auto-seed prompts", True, f"Successfully seeded {len(items)} prompts with correct structure")
        
        # Store a prompt ID for later tests
        global test_prompt_id
        test_prompt_id = items[0]["id"]
        
    except Exception as e:
        log_test("Auto-seed prompts", False, f"Exception: {str(e)}")

def test_search_filter():
    """Test 2: GET /api/prompts?search=Floating"""
    print("\n=== Test 2: Search filter (search=Floating) ===")
    try:
        response = requests.get(f"{BASE_URL}/prompts?search=Floating", timeout=10)
        
        if response.status_code != 200:
            log_test("Search filter", False, f"Expected 200, got {response.status_code}")
            return
        
        data = response.json()
        items = data.get("items", [])
        
        if len(items) == 0:
            log_test("Search filter", False, "No results found for 'Floating'")
            return
        
        # Verify at least one item contains "Floating" in title, prompt, or tools
        found = False
        for item in items:
            title = item.get("title", "").lower()
            prompt = item.get("prompt", "").lower()
            tools = " ".join(item.get("tools", [])).lower()
            
            if "floating" in title or "floating" in prompt or "floating" in tools:
                found = True
                break
        
        if not found:
            log_test("Search filter", False, "Results don't contain 'Floating' in title/prompt/tools")
            return
        
        log_test("Search filter", True, f"Found {len(items)} results matching 'Floating'")
        
    except Exception as e:
        log_test("Search filter", False, f"Exception: {str(e)}")

def test_type_filter():
    """Test 3: GET /api/prompts?type=image and ?type=video"""
    print("\n=== Test 3: Type filters (type=image, type=video) ===")
    
    # Test image filter
    try:
        response = requests.get(f"{BASE_URL}/prompts?type=image", timeout=10)
        
        if response.status_code != 200:
            log_test("Type filter (image)", False, f"Expected 200, got {response.status_code}")
        else:
            data = response.json()
            items = data.get("items", [])
            
            # Verify all items are type=image
            non_image = [item for item in items if item.get("type") != "image"]
            if non_image:
                log_test("Type filter (image)", False, f"Found {len(non_image)} non-image items")
            else:
                log_test("Type filter (image)", True, f"All {len(items)} items are type=image")
    except Exception as e:
        log_test("Type filter (image)", False, f"Exception: {str(e)}")
    
    # Test video filter
    try:
        response = requests.get(f"{BASE_URL}/prompts?type=video", timeout=10)
        
        if response.status_code != 200:
            log_test("Type filter (video)", False, f"Expected 200, got {response.status_code}")
        else:
            data = response.json()
            items = data.get("items", [])
            
            # Verify all items are type=video
            non_video = [item for item in items if item.get("type") != "video"]
            if non_video:
                log_test("Type filter (video)", False, f"Found {len(non_video)} non-video items")
            else:
                log_test("Type filter (video)", True, f"All {len(items)} items are type=video")
    except Exception as e:
        log_test("Type filter (video)", False, f"Exception: {str(e)}")

def test_tool_filter():
    """Test 4: GET /api/prompts?tool=Veo and ?tool=ChatGPT"""
    print("\n=== Test 4: Tool filters (tool=Veo, tool=ChatGPT) ===")
    
    # Test Veo filter
    try:
        response = requests.get(f"{BASE_URL}/prompts?tool=Veo", timeout=10)
        
        if response.status_code != 200:
            log_test("Tool filter (Veo)", False, f"Expected 200, got {response.status_code}")
        else:
            data = response.json()
            items = data.get("items", [])
            
            # Verify all items contain Veo in tools
            without_veo = [item for item in items if "Veo" not in item.get("tools", [])]
            if without_veo:
                log_test("Tool filter (Veo)", False, f"Found {len(without_veo)} items without Veo")
            else:
                log_test("Tool filter (Veo)", True, f"All {len(items)} items contain Veo")
    except Exception as e:
        log_test("Tool filter (Veo)", False, f"Exception: {str(e)}")
    
    # Test ChatGPT filter
    try:
        response = requests.get(f"{BASE_URL}/prompts?tool=ChatGPT", timeout=10)
        
        if response.status_code != 200:
            log_test("Tool filter (ChatGPT)", False, f"Expected 200, got {response.status_code}")
        else:
            data = response.json()
            items = data.get("items", [])
            
            # Verify all items contain ChatGPT in tools
            without_chatgpt = [item for item in items if "ChatGPT" not in item.get("tools", [])]
            if without_chatgpt:
                log_test("Tool filter (ChatGPT)", False, f"Found {len(without_chatgpt)} items without ChatGPT")
            else:
                log_test("Tool filter (ChatGPT)", True, f"All {len(items)} items contain ChatGPT")
    except Exception as e:
        log_test("Tool filter (ChatGPT)", False, f"Exception: {str(e)}")

def test_get_prompt_by_id():
    """Test 5: GET /api/prompts/:id"""
    print("\n=== Test 5: Get prompt by ID ===")
    
    global test_prompt_id
    
    if not test_prompt_id:
        log_test("Get prompt by ID", False, "No test_prompt_id available")
        return
    
    try:
        # Test valid ID
        response = requests.get(f"{BASE_URL}/prompts/{test_prompt_id}", timeout=10)
        
        if response.status_code != 200:
            log_test("Get prompt by ID (valid)", False, f"Expected 200, got {response.status_code}")
        else:
            data = response.json()
            if data.get("id") != test_prompt_id:
                log_test("Get prompt by ID (valid)", False, f"ID mismatch: expected {test_prompt_id}, got {data.get('id')}")
            else:
                log_test("Get prompt by ID (valid)", True, f"Successfully retrieved prompt {test_prompt_id}")
        
        # Test non-existent ID
        fake_id = "00000000-0000-0000-0000-000000000000"
        response = requests.get(f"{BASE_URL}/prompts/{fake_id}", timeout=10)
        
        if response.status_code != 404:
            log_test("Get prompt by ID (404)", False, f"Expected 404 for non-existent ID, got {response.status_code}")
        else:
            log_test("Get prompt by ID (404)", True, "Correctly returns 404 for non-existent ID")
            
    except Exception as e:
        log_test("Get prompt by ID", False, f"Exception: {str(e)}")

def test_admin_login():
    """Test 6: POST /api/admin/login"""
    print("\n=== Test 6: Admin login ===")
    
    global admin_token
    
    # Test wrong password
    try:
        response = requests.post(
            f"{BASE_URL}/admin/login",
            json={"password": "wrongpass"},
            timeout=10
        )
        
        if response.status_code != 401:
            log_test("Admin login (wrong password)", False, f"Expected 401, got {response.status_code}")
        else:
            log_test("Admin login (wrong password)", True, "Correctly returns 401 for wrong password")
    except Exception as e:
        log_test("Admin login (wrong password)", False, f"Exception: {str(e)}")
    
    # Test correct password
    try:
        response = requests.post(
            f"{BASE_URL}/admin/login",
            json={"password": ADMIN_PASSWORD},
            timeout=10
        )
        
        if response.status_code != 200:
            log_test("Admin login (correct password)", False, f"Expected 200, got {response.status_code}")
            return
        
        data = response.json()
        if "token" not in data:
            log_test("Admin login (correct password)", False, "Response missing 'token' field")
            return
        
        admin_token = data["token"]
        log_test("Admin login (correct password)", True, f"Successfully logged in, token: {admin_token[:20]}...")
        
    except Exception as e:
        log_test("Admin login (correct password)", False, f"Exception: {str(e)}")

def test_create_prompt():
    """Test 7: POST /api/prompts (admin create)"""
    print("\n=== Test 7: Create prompt (admin) ===")
    
    global admin_token, test_prompt_id
    
    # Test without authorization
    try:
        response = requests.post(
            f"{BASE_URL}/prompts",
            json={"title": "Test", "prompt": "Test prompt"},
            timeout=10
        )
        
        if response.status_code != 401:
            log_test("Create prompt (no auth)", False, f"Expected 401, got {response.status_code}")
        else:
            log_test("Create prompt (no auth)", True, "Correctly returns 401 without auth")
    except Exception as e:
        log_test("Create prompt (no auth)", False, f"Exception: {str(e)}")
    
    # Test with authorization
    if not admin_token:
        log_test("Create prompt (with auth)", False, "No admin token available")
        return
    
    try:
        new_prompt = {
            "title": "Test Cinematic Sunset",
            "prompt": "A beautiful cinematic sunset over the ocean, golden hour lighting, 4K resolution",
            "type": "image",
            "tools": ["ChatGPT", "Midjourney"],
            "thumbnail": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&q=80",
            "instructions": [
                "Open your AI image tool",
                "Paste the prompt",
                "Generate and enjoy"
            ],
            "toolLinks": [
                {"name": "ChatGPT", "url": "https://chatgpt.com"},
                {"name": "Midjourney", "url": "https://midjourney.com"}
            ]
        }
        
        response = requests.post(
            f"{BASE_URL}/prompts",
            json=new_prompt,
            headers={"Authorization": f"Bearer {admin_token}"},
            timeout=10
        )
        
        if response.status_code != 200:
            log_test("Create prompt (with auth)", False, f"Expected 200, got {response.status_code}: {response.text}")
            return
        
        data = response.json()
        
        # Verify response has ID
        if "id" not in data:
            log_test("Create prompt (with auth)", False, "Response missing 'id' field")
            return
        
        # Store the new prompt ID for update/delete tests
        test_prompt_id = data["id"]
        
        # Verify all fields are present
        if data.get("title") != new_prompt["title"]:
            log_test("Create prompt (with auth)", False, "Title mismatch")
            return
        
        log_test("Create prompt (with auth)", True, f"Successfully created prompt with ID: {test_prompt_id}")
        
    except Exception as e:
        log_test("Create prompt (with auth)", False, f"Exception: {str(e)}")

def test_update_prompt():
    """Test 8: PUT /api/prompts/:id (admin update)"""
    print("\n=== Test 8: Update prompt (admin) ===")
    
    global admin_token, test_prompt_id
    
    if not test_prompt_id:
        log_test("Update prompt", False, "No test_prompt_id available")
        return
    
    # Test without authorization
    try:
        response = requests.put(
            f"{BASE_URL}/prompts/{test_prompt_id}",
            json={"published": False},
            timeout=10
        )
        
        if response.status_code != 401:
            log_test("Update prompt (no auth)", False, f"Expected 401, got {response.status_code}")
        else:
            log_test("Update prompt (no auth)", True, "Correctly returns 401 without auth")
    except Exception as e:
        log_test("Update prompt (no auth)", False, f"Exception: {str(e)}")
    
    # Test with authorization - set published to false
    if not admin_token:
        log_test("Update prompt (with auth)", False, "No admin token available")
        return
    
    try:
        response = requests.put(
            f"{BASE_URL}/prompts/{test_prompt_id}",
            json={"published": False},
            headers={"Authorization": f"Bearer {admin_token}"},
            timeout=10
        )
        
        if response.status_code != 200:
            log_test("Update prompt (with auth)", False, f"Expected 200, got {response.status_code}: {response.text}")
            return
        
        data = response.json()
        
        if data.get("published") != False:
            log_test("Update prompt (with auth)", False, f"Expected published=false, got {data.get('published')}")
            return
        
        log_test("Update prompt (with auth)", True, f"Successfully updated prompt {test_prompt_id} to unpublished")
        
        # Verify unpublished prompt is NOT in public list
        response = requests.get(f"{BASE_URL}/prompts", timeout=10)
        data = response.json()
        items = data.get("items", [])
        
        found_in_public = any(item.get("id") == test_prompt_id for item in items)
        if found_in_public:
            log_test("Update prompt (public list check)", False, "Unpublished prompt appears in public list")
        else:
            log_test("Update prompt (public list check)", True, "Unpublished prompt correctly hidden from public list")
        
        # Verify unpublished prompt IS in admin list with ?all=1
        response = requests.get(
            f"{BASE_URL}/prompts?all=1",
            headers={"Authorization": f"Bearer {admin_token}"},
            timeout=10
        )
        data = response.json()
        items = data.get("items", [])
        
        found_in_admin = any(item.get("id") == test_prompt_id for item in items)
        if not found_in_admin:
            log_test("Update prompt (admin list check)", False, "Unpublished prompt missing from admin list with ?all=1")
        else:
            log_test("Update prompt (admin list check)", True, "Unpublished prompt correctly appears in admin list with ?all=1")
        
    except Exception as e:
        log_test("Update prompt (with auth)", False, f"Exception: {str(e)}")

def test_delete_prompt():
    """Test 9: DELETE /api/prompts/:id (admin)"""
    print("\n=== Test 9: Delete prompt (admin) ===")
    
    global admin_token, test_prompt_id
    
    if not test_prompt_id:
        log_test("Delete prompt", False, "No test_prompt_id available")
        return
    
    # Test without authorization
    try:
        response = requests.delete(
            f"{BASE_URL}/prompts/{test_prompt_id}",
            timeout=10
        )
        
        if response.status_code != 401:
            log_test("Delete prompt (no auth)", False, f"Expected 401, got {response.status_code}")
        else:
            log_test("Delete prompt (no auth)", True, "Correctly returns 401 without auth")
    except Exception as e:
        log_test("Delete prompt (no auth)", False, f"Exception: {str(e)}")
    
    # Test with authorization
    if not admin_token:
        log_test("Delete prompt (with auth)", False, "No admin token available")
        return
    
    try:
        response = requests.delete(
            f"{BASE_URL}/prompts/{test_prompt_id}",
            headers={"Authorization": f"Bearer {admin_token}"},
            timeout=10
        )
        
        if response.status_code != 200:
            log_test("Delete prompt (with auth)", False, f"Expected 200, got {response.status_code}: {response.text}")
            return
        
        data = response.json()
        
        if data.get("ok") != True:
            log_test("Delete prompt (with auth)", False, f"Expected {{ok:true}}, got {data}")
            return
        
        log_test("Delete prompt (with auth)", True, f"Successfully deleted prompt {test_prompt_id}")
        
        # Verify deleted prompt returns 404
        response = requests.get(f"{BASE_URL}/prompts/{test_prompt_id}", timeout=10)
        
        if response.status_code != 404:
            log_test("Delete prompt (404 check)", False, f"Expected 404 for deleted prompt, got {response.status_code}")
        else:
            log_test("Delete prompt (404 check)", True, "Deleted prompt correctly returns 404")
        
    except Exception as e:
        log_test("Delete prompt (with auth)", False, f"Exception: {str(e)}")

def test_admin_check():
    """Test 10: GET /api/admin/check"""
    print("\n=== Test 10: Admin check endpoint ===")
    
    global admin_token
    
    # Test without token
    try:
        response = requests.get(f"{BASE_URL}/admin/check", timeout=10)
        
        if response.status_code != 200:
            log_test("Admin check (no token)", False, f"Expected 200, got {response.status_code}")
        else:
            data = response.json()
            # Check for falsy value (false, empty string, etc.)
            if data.get("authed"):
                log_test("Admin check (no token)", False, f"Expected falsy authed value, got {data.get('authed')}")
            else:
                log_test("Admin check (no token)", True, f"Correctly returns falsy authed value without token (got: {data.get('authed')})")
    except Exception as e:
        log_test("Admin check (no token)", False, f"Exception: {str(e)}")
    
    # Test with valid token
    if not admin_token:
        log_test("Admin check (with token)", False, "No admin token available")
        return
    
    try:
        response = requests.get(
            f"{BASE_URL}/admin/check",
            headers={"Authorization": f"Bearer {admin_token}"},
            timeout=10
        )
        
        if response.status_code != 200:
            log_test("Admin check (with token)", False, f"Expected 200, got {response.status_code}")
        else:
            data = response.json()
            if data.get("authed") != True:
                log_test("Admin check (with token)", False, f"Expected authed=true, got {data.get('authed')}")
            else:
                log_test("Admin check (with token)", True, "Correctly returns authed=true with valid token")
    except Exception as e:
        log_test("Admin check (with token)", False, f"Exception: {str(e)}")

def print_summary():
    """Print test summary"""
    print("\n" + "="*60)
    print("TEST SUMMARY")
    print("="*60)
    print(f"Total Tests: {test_results['passed'] + test_results['failed']}")
    print(f"✅ Passed: {test_results['passed']}")
    print(f"❌ Failed: {test_results['failed']}")
    print("="*60)
    
    if test_results['failed'] > 0:
        print("\nFailed Tests:")
        for test in test_results['tests']:
            if not test['passed']:
                print(f"  - {test['name']}: {test['message']}")
    
    return test_results['failed'] == 0

def main():
    """Run all tests"""
    print("="*60)
    print("TrendyPrompt Backend API Test Suite")
    print("="*60)
    print(f"Base URL: {BASE_URL}")
    print(f"Admin Password: {ADMIN_PASSWORD}")
    print("="*60)
    
    # Run tests in order
    test_auto_seed_prompts()
    test_search_filter()
    test_type_filter()
    test_tool_filter()
    test_get_prompt_by_id()
    test_admin_login()
    test_create_prompt()
    test_update_prompt()
    test_delete_prompt()
    test_admin_check()
    
    # Print summary
    all_passed = print_summary()
    
    # Exit with appropriate code
    sys.exit(0 if all_passed else 1)

if __name__ == "__main__":
    main()
