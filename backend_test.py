import requests
import json
import sys
from datetime import datetime

class TradeTrackerAPITester:
    def __init__(self, base_url="http://localhost:8000/api"):
        self.base_url = base_url
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.results = {}

    def log(self, message):
        print(f"[{datetime.now().strftime('%H:%M:%S')}] {message}")

    def run_test(self, name, method, endpoint, expected_status, data=None, params=None):
        """Run a single API test"""
        url = f"{self.base_url}{endpoint}"
        headers = {'Content-Type': 'application/json'}
        if self.token:
            headers['Authorization'] = f'Bearer {self.token}'

        self.tests_run += 1
        self.log(f"🔍 Testing {name}...")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, params=params)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                self.log(f"✅ PASS - {name} - Status: {response.status_code}")
                try:
                    response_data = response.json()
                except:
                    response_data = response.text if response.content else {}
                
                self.results[name] = {
                    'status': 'PASS',
                    'expected_status': expected_status,
                    'actual_status': response.status_code,
                    'response_data': response_data
                }
                return True, response_data
            else:
                self.log(f"❌ FAIL - {name} - Expected {expected_status}, got {response.status_code}")
                try:
                    error_data = response.json()
                except:
                    error_data = response.text if response.content else {}
                
                self.results[name] = {
                    'status': 'FAIL',
                    'expected_status': expected_status,
                    'actual_status': response.status_code,
                    'error_data': error_data
                }
                return False, error_data

        except Exception as e:
            self.log(f"❌ FAIL - {name} - Error: {str(e)}")
            self.results[name] = {
                'status': 'FAIL',
                'expected_status': expected_status,
                'actual_status': 'EXCEPTION',
                'error': str(e)
            }
            return False, {}

    def test_auth(self):
        """Test authentication with demo user"""
        self.log("\n=== AUTHENTICATION TESTS ===")
        
        # Test login with demo user
        success, response = self.run_test(
            "Demo User Login",
            "POST",
            "/auth/login",
            200,
            data={"email": "demo@agent.com", "password": "demo123"}
        )
        
        if success and 'token' in response:
            self.token = response['token']
            self.log(f"✅ Auth token obtained: {self.token[:20]}...")
            return True
        else:
            self.log("❌ Failed to get auth token")
            return False

    def test_commission_reports(self):
        """Test commission report endpoints"""
        self.log("\n=== COMMISSION REPORT TESTS ===")
        
        # Test commission report with FY parameter
        self.run_test(
            "Commission Report (FY 2025)",
            "GET",
            "/reports/commission",
            200,
            params={"fy": 2025}
        )
        
        # Test commission report without FY (should default to current)
        self.run_test(
            "Commission Report (Default FY)",
            "GET",
            "/reports/commission",
            200
        )
        
        # Test CSV export
        # This will test if the endpoint returns CSV data
        try:
            url = f"{self.base_url}/reports/commission/export?fy=2025"
            headers = {'Authorization': f'Bearer {self.token}'}
            response = requests.get(url, headers=headers)
            
            self.tests_run += 1
            if response.status_code == 200:
                # Check if response is CSV format
                content_type = response.headers.get('content-type', '')
                is_csv = 'csv' in content_type.lower() or 'text/' in content_type.lower()
                
                if is_csv and len(response.text) > 0:
                    self.tests_passed += 1
                    self.log("✅ PASS - Commission CSV Export")
                    self.results["Commission CSV Export"] = {
                        'status': 'PASS',
                        'content_type': content_type,
                        'data_length': len(response.text)
                    }
                else:
                    self.log(f"❌ FAIL - CSV Export - Wrong content type: {content_type}")
                    self.results["Commission CSV Export"] = {
                        'status': 'FAIL',
                        'content_type': content_type,
                        'error': 'Not CSV format'
                    }
            else:
                self.log(f"❌ FAIL - CSV Export - Status: {response.status_code}")
                self.results["Commission CSV Export"] = {
                    'status': 'FAIL',
                    'actual_status': response.status_code
                }
        except Exception as e:
            self.log(f"❌ FAIL - CSV Export - Error: {str(e)}")
            self.results["Commission CSV Export"] = {
                'status': 'FAIL',
                'error': str(e)
            }

    def test_analytics_endpoints(self):
        """Test analytics endpoints with FY filtering"""
        self.log("\n=== ANALYTICS ENDPOINTS TESTS ===")
        
        # Test suppliers analytics with FY
        self.run_test(
            "Suppliers Analytics (FY 2025)",
            "GET",
            "/analytics/suppliers",
            200,
            params={"fy": 2025}
        )
        
        # Test customers analytics with FY
        self.run_test(
            "Customers Analytics (FY 2025)",
            "GET",
            "/analytics/customers",
            200,
            params={"fy": 2025}
        )
        
        # Test best customers endpoint
        self.run_test(
            "Best Customers (FY 2025)",
            "GET",
            "/analytics/best-customers",
            200,
            params={"fy": 2025}
        )
        
        # Test claims analysis endpoint
        self.run_test(
            "Claims Analysis (FY 2025)",
            "GET",
            "/analytics/claims",
            200,
            params={"fy": 2025}
        )
        
        # Test cashflow (no FY param needed)
        self.run_test(
            "Cash Flow Analytics",
            "GET",
            "/analytics/cashflow",
            200
        )

    def test_close_trade(self):
        """Test close trade functionality"""
        self.log("\n=== CLOSE TRADE TESTS ===")
        
        # First, get existing trades to find one to close
        success, trades_data = self.run_test(
            "Get Trades for Close Test",
            "GET",
            "/trades",
            200
        )
        
        if success and trades_data:
            # Find an active trade to test close functionality
            active_trade = None
            for trade in trades_data:
                if trade.get('status') == 'active':
                    active_trade = trade
                    break
            
            if active_trade:
                trade_id = active_trade['id']
                # Test close trade endpoint
                self.run_test(
                    "Close Trade",
                    "PUT",
                    f"/trades/{trade_id}/close",
                    200,
                    data={"claims": 1, "close_notes": "Test closing trade"}
                )
                
                # Verify trade was closed by checking its status
                success, updated_trade = self.run_test(
                    "Verify Trade Closed",
                    "GET",
                    f"/trades/{trade_id}",
                    200
                )
                
                if success and updated_trade.get('status') == 'completed':
                    self.log("✅ Trade closure verification passed")
                else:
                    self.log("❌ Trade closure verification failed")
            else:
                self.log("⚠️  No active trades found to test close functionality")
        else:
            self.log("❌ Could not retrieve trades for close test")

    def test_existing_features(self):
        """Test some existing features to ensure nothing is broken"""
        self.log("\n=== EXISTING FEATURES VERIFICATION ===")
        
        # Test dashboard summary
        self.run_test(
            "Dashboard Summary",
            "GET",
            "/dashboard/summary",
            200
        )
        
        # Test dashboard heatmap
        self.run_test(
            "Dashboard Heatmap",
            "GET",
            "/dashboard/heatmap",
            200
        )
        
        # Test trades listing
        self.run_test(
            "Trades Listing",
            "GET",
            "/trades",
            200
        )

    def generate_summary(self):
        """Generate test summary"""
        self.log(f"\n📊 TEST SUMMARY")
        self.log(f"Tests Run: {self.tests_run}")
        self.log(f"Tests Passed: {self.tests_passed}")
        self.log(f"Success Rate: {(self.tests_passed/self.tests_run*100):.1f}%")
        
        # Show failed tests
        failed_tests = [name for name, result in self.results.items() if result.get('status') == 'FAIL']
        if failed_tests:
            self.log(f"\n❌ Failed Tests ({len(failed_tests)}):")
            for test_name in failed_tests:
                result = self.results[test_name]
                if 'actual_status' in result:
                    self.log(f"  • {test_name}: Expected {result.get('expected_status')}, got {result.get('actual_status')}")
                else:
                    self.log(f"  • {test_name}: {result.get('error', 'Unknown error')}")
        
        return self.tests_passed == self.tests_run

def main():
    tester = TradeTrackerAPITester()
    
    # Run authentication first
    if not tester.test_auth():
        print("❌ Authentication failed. Cannot proceed with other tests.")
        return 1
    
    # Run all test categories
    tester.test_commission_reports()
    tester.test_analytics_endpoints() 
    tester.test_close_trade()
    tester.test_existing_features()
    
    # Generate summary and return exit code
    all_passed = tester.generate_summary()
    
    # Save detailed results
    with open('/tmp/api_test_results.json', 'w') as f:
        json.dump(tester.results, f, indent=2)
    
    return 0 if all_passed else 1

if __name__ == "__main__":
    sys.exit(main())