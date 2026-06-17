#====================================================================================================
# START - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================

# THIS SECTION CONTAINS CRITICAL TESTING INSTRUCTIONS FOR BOTH AGENTS
# BOTH MAIN_AGENT AND TESTING_AGENT MUST PRESERVE THIS ENTIRE BLOCK

# Communication Protocol:
# If the `testing_agent` is available, main agent should delegate all testing tasks to it.
#
# You have access to a file called `test_result.md`. This file contains the complete testing state
# and history, and is the primary means of communication between main and the testing agent.
#
# Main and testing agents must follow this exact format to maintain testing data. 
# The testing data must be entered in yaml format Below is the data structure:
# 
## user_problem_statement: {problem_statement}
## backend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.py"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## frontend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.js"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## metadata:
##   created_by: "main_agent"
##   version: "1.0"
##   test_sequence: 0
##   run_ui: false
##
## test_plan:
##   current_focus:
##     - "Task name 1"
##     - "Task name 2"
##   stuck_tasks:
##     - "Task name with persistent issues"
##   test_all: false
##   test_priority: "high_first"  # or "sequential" or "stuck_first"
##
## agent_communication:
##     -agent: "main"  # or "testing" or "user"
##     -message: "Communication message between agents"

# Protocol Guidelines for Main agent
#
# 1. Update Test Result File Before Testing:
#    - Main agent must always update the `test_result.md` file before calling the testing agent
#    - Add implementation details to the status_history
#    - Set `needs_retesting` to true for tasks that need testing
#    - Update the `test_plan` section to guide testing priorities
#    - Add a message to `agent_communication` explaining what you've done
#
# 2. Incorporate User Feedback:
#    - When a user provides feedback that something is or isn't working, add this information to the relevant task's status_history
#    - Update the working status based on user feedback
#    - If a user reports an issue with a task that was marked as working, increment the stuck_count
#    - Whenever user reports issue in the app, if we have testing agent and task_result.md file so find the appropriate task for that and append in status_history of that task to contain the user concern and problem as well 
#
# 3. Track Stuck Tasks:
#    - Monitor which tasks have high stuck_count values or where you are fixing same issue again and again, analyze that when you read task_result.md
#    - For persistent issues, use websearch tool to find solutions
#    - Pay special attention to tasks in the stuck_tasks list
#    - When you fix an issue with a stuck task, don't reset the stuck_count until the testing agent confirms it's working
#
# 4. Provide Context to Testing Agent:
#    - When calling the testing agent, provide clear instructions about:
#      - Which tasks need testing (reference the test_plan)
#      - Any authentication details or configuration needed
#      - Specific test scenarios to focus on
#      - Any known issues or edge cases to verify
#
# 5. Call the testing agent with specific instructions referring to test_result.md
#
# IMPORTANT: Main agent must ALWAYS update test_result.md BEFORE calling the testing agent, as it relies on this file to understand what to test next.

#====================================================================================================
# END - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================



#====================================================================================================
# Testing Data - Main Agent and testing sub agent both should log testing data below this section
#====================================================================================================

user_problem_statement: |
  Build TrendyPrompt: a mobile-first viral AI prompt library. Public users browse Pinterest-style
  prompt cards, search, filter by Images/Videos/ChatGPT/Gemini/Veo/Kling, open detail page,
  copy prompts with one click, read step-by-step instructions, view tool links. Admin panel
  (password-only) to create / edit / delete / publish prompts with thumbnail uploads.
  Stack: Next.js + MongoDB (default), Apple-clean design.

backend:
  - task: "Auto-seed prompts on first GET"
    implemented: true
    working: true
    file: "app/api/[[...path]]/route.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: "NA"
        agent: "main"
        comment: "On first GET /api/prompts the API seeds 8 sample prompts if collection empty."
      - working: true
        agent: "testing"
        comment: "✅ PASSED - Successfully seeded 8 prompts with correct structure. All required fields present (id, title, type, tools, thumbnail, prompt, instructions, toolLinks, published, createdAt). Arrays validated correctly."
  - task: "GET /api/prompts with filters (search, type, tool)"
    implemented: true
    working: true
    file: "app/api/[[...path]]/route.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: "NA"
        agent: "main"
        comment: "Supports ?search= (regex on title/prompt/tools), ?type=image|video, ?tool=Name. Only returns published unless admin token + ?all=1."
      - working: true
        agent: "testing"
        comment: "✅ PASSED - Search filter: Found 1 result for 'Floating'. Type filters: image (5 items) and video (3 items) work correctly. Tool filters: Veo (2 items) and ChatGPT (4 items) work correctly. All filters return accurate results."
  - task: "GET /api/prompts/:id detail"
    implemented: true
    working: true
    file: "app/api/[[...path]]/route.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: "NA"
        agent: "main"
        comment: "Returns full doc by id. Unpublished returns 404 without admin token."
      - working: true
        agent: "testing"
        comment: "✅ PASSED - Valid ID returns correct prompt document. Non-existent ID correctly returns 404. Unpublished prompts correctly return 404 without admin token."
  - task: "POST /api/admin/login returns token"
    implemented: true
    working: true
    file: "app/api/[[...path]]/route.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: "NA"
        agent: "main"
        comment: "Body {password}. Correct password = trendyprompt2025 (from .env). Returns {token} uuid stored in-memory."
      - working: true
        agent: "testing"
        comment: "✅ PASSED - Wrong password correctly returns 401. Correct password (trendyprompt2025) successfully returns JWT token. Token format validated as UUID."
      - working: true
        agent: "testing"
        comment: "✅ RE-VERIFIED - Auth flow working correctly after MongoDB token refactor. Wrong password returns 401, correct password returns token (ae8fefcc-c737-4af0-8...). Token successfully stored in MongoDB admin_tokens collection."
  - task: "POST /api/prompts (admin) create"
    implemented: true
    working: true
    file: "app/api/[[...path]]/route.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: "NA"
        agent: "main"
        comment: "Requires Bearer token. Creates new prompt with all fields, generates uuid id."
      - working: true
        agent: "testing"
        comment: "✅ PASSED - Without auth correctly returns 401. With valid Bearer token successfully creates prompt with all fields (title, prompt, type, tools, thumbnail, instructions, toolLinks). UUID id generated correctly."
  - task: "PUT /api/prompts/:id (admin) update"
    implemented: true
    working: true
    file: "app/api/[[...path]]/route.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: "NA"
        agent: "main"
        comment: "Requires Bearer token. Partial updates allowed (title, prompt, published, etc)."
      - working: true
        agent: "testing"
        comment: "✅ PASSED - Without auth correctly returns 401. With auth successfully updates prompt. Published=false correctly hides prompt from public GET /api/prompts. Unpublished prompt correctly appears in admin list with ?all=1 token."
  - task: "DELETE /api/prompts/:id (admin)"
    implemented: true
    working: true
    file: "app/api/[[...path]]/route.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: "NA"
        agent: "main"
        comment: "Requires Bearer token. Returns {ok:true}."
      - working: true
        agent: "testing"
        comment: "✅ PASSED - Without auth correctly returns 401. With auth successfully deletes prompt and returns {ok:true}. Deleted prompt correctly returns 404 on subsequent GET."
  - task: "Authorization enforcement"
    implemented: true
    working: true
    file: "app/api/[[...path]]/route.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: "NA"
        agent: "main"
        comment: "POST/PUT/DELETE without valid Bearer token must return 401."
      - working: true
        agent: "testing"
        comment: "✅ PASSED - All POST/PUT/DELETE operations correctly return 401 without valid Bearer token. All operations work correctly with valid token. GET /api/admin/check returns falsy value without token and true with valid token."
      - working: true
        agent: "testing"
        comment: "✅ RE-VERIFIED - Authorization enforcement working correctly with MongoDB-backed tokens. POST/PUT/DELETE all return 401 without token. GET /api/admin/check returns {authed:false} without token and {authed:true} with valid token. All protected operations work with valid Bearer token."

frontend:
  - task: "Public site UI"
    implemented: true
    working: "NA"
    file: "app/page.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: false

metadata:
  created_by: "main_agent"
  version: "1.0"
  test_sequence: 1

test_plan:
  current_focus:
    - "Auto-seed prompts on first GET"
    - "GET /api/prompts with filters (search, type, tool)"
    - "GET /api/prompts/:id detail"
    - "POST /api/admin/login returns token"
    - "POST /api/prompts (admin) create"
    - "PUT /api/prompts/:id (admin) update"
    - "DELETE /api/prompts/:id (admin)"
    - "Authorization enforcement"
  stuck_tasks: []
  test_all: true
  test_priority: "high_first"

agent_communication:
  - agent: "main"
    message: |
      Initial TrendyPrompt MVP complete. Backend uses MongoDB collection 'prompts' in DB 'trendyprompt'.
      Admin password from .env (ADMIN_PASSWORD=trendyprompt2025). Tokens are in-memory.
      Please test all endpoints: GET list w/ filters, GET detail, admin login, create/update/delete
      with and without valid Bearer token. Verify 401s, 404s, and that unpublished items hide from public.
  - agent: "testing"
    message: |
      Backend testing complete. All 8 backend tasks tested successfully with 21/21 tests passing.
      
      ✅ All endpoints working correctly:
      - Auto-seed: 8 prompts seeded with correct structure
      - Filters: search, type (image/video), tool (Veo/ChatGPT) all working
      - GET by ID: valid IDs return data, invalid return 404
      - Admin login: wrong password returns 401, correct returns token
      - Create: requires auth, creates with UUID
      - Update: requires auth, published=false hides from public, visible in admin ?all=1
      - Delete: requires auth, returns {ok:true}, subsequent GET returns 404
      - Authorization: all protected endpoints return 401 without token
      
      No critical issues found. Backend API is fully functional.
  - agent: "testing"
    message: |
      Re-verification complete after MongoDB token refactor. All 21/21 tests passing.
      
      ✅ Auth flow verified with MongoDB-backed tokens:
      - POST /api/admin/login: wrong password → 401, correct password → 200 with token
      - Token storage: Successfully stored in MongoDB admin_tokens collection with TTL (30 days)
      - GET /api/admin/check: no token → {authed:false}, with token → {authed:true}
      - POST /api/prompts: no auth → 401, with auth → 200 (created test prompt)
      - PUT /api/prompts/:id: no auth → 401, with auth → 200 (updated to unpublished)
      - GET /api/prompts: unpublished prompt correctly hidden from public list
      - GET /api/prompts?all=1: unpublished prompt correctly visible with admin token
      - DELETE /api/prompts/:id: no auth → 401, with auth → 200 {ok:true}
      
      MongoDB token refactor successful. All auth flows working correctly.
