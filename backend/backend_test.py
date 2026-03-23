#!/usr/bin/env python3
import requests
import sys
import json
from datetime import datetime, timedelta
import uuid

class TradeTrackerAPITester:
    def __init__(self, base_url="http://localhost:8000/api"):
        self.base_url = base_url
        self.token = None
        self.test_user_id = None
        self.test_trade_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []
        
        # Test data
        self.test_email = f"test_{datetime.now().strftime('%Y%m%d_%H%M%S')}@example.com"
        self.test_password = "TestPassword123!"
        self.test_name = "Test User"

    def log_test(self, name, success, details=""):
        """Log test results"""
        self.tests_run += 1
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} | {name}")
        if details:
            print(f"      {details}")
        if success:
            self.tests_passed += 1
        else:
            self.failed_tests.append(f"{name}: {details}")

    def make_request(self, method, endpoint, data=None, expected_status=200, description=""):
        """Make HTTP request and validate response"""
        url = f"{self.base_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        if self.token:
            headers['Authorization'] = f'Bearer {self.token}'
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers)
            
            success = response.status_code == expected_status
            
            if success:
                try:
                    return True, response.json() if response.content else {}
                except:
                    return True, {}
            else:
                return False, f"Expected {expected_status}, got {response.status_code}: {response.text[:200]}"
                
        except Exception as e:
            return False, f"Request failed: {str(e)}"

    def test_health_check(self):
        """Test basic API health"""
        success, result = self.make_request('GET', '', 200)
        self.log_test("API Health Check", success, 
                     f"Response: {result.get('message', 'No message')}" if success else result)
        return success

    def test_register(self):
        """Test user registration"""
        data = {
            "name": self.test_name,
            "email": self.test_email,
            "password": self.test_password
        }
        success, result = self.make_request('POST', 'auth/register', data, 200)
        
        if success:
            self.token = result.get('token')
            self.test_user_id = result.get('user', {}).get('id')
            self.log_test("User Registration", True, f"User ID: {self.test_user_id}")
        else:
            self.log_test("User Registration", False, result)
        
        return success

    def test_login(self):
        """Test user login"""
        data = {
            "email": self.test_email,
            "password": self.test_password
        }
        success, result = self.make_request('POST', 'auth/login', data, 200)
        
        if success:
            token = result.get('token')
            self.log_test("User Login", True, f"Token received: {bool(token)}")
        else:
            self.log_test("User Login", False, result)
        
        return success

    def test_get_me(self):
        """Test get current user info"""
        success, result = self.make_request('GET', 'auth/me', expected_status=200)
        
        if success:
            user_email = result.get('email')
            self.log_test("Get Current User", True, f"Email: {user_email}")
        else:
            self.log_test("Get Current User", False, result)
        
        return success

    def test_seed_demo_data(self):
        """Test seeding demo data"""
        success, result = self.make_request('POST', 'seed-demo', expected_status=200)
        
        if success:
            count = result.get('count', 0)
            self.log_test("Seed Demo Data", True, f"Created {count} trades")
        else:
            self.log_test("Seed Demo Data", False, result)
        
        return success

    def test_get_trades(self):
        """Test getting trades list"""
        success, result = self.make_request('GET', 'trades', expected_status=200)
        
        if success:
            trades = result if isinstance(result, list) else []
            trade_count = len(trades)
            self.log_test("Get Trades List", True, f"Found {trade_count} trades")
            
            # Store first trade ID for update/delete tests
            if trades:
                self.test_trade_id = trades[0].get('id')
        else:
            self.log_test("Get Trades List", False, result)
        
        return success

    def test_create_trade(self):
        """Test creating a new trade"""
        trade_data = {
            "container_name": f"TEST-{datetime.now().strftime('%Y%m%d-%H%M%S')}",
            "cbm": 50.0,
            "supplier_name": "Test Supplier Co.",
            "customer_name": "Test Customer LLC",
            "official_bill_rate": 600.0,
            "supplier_total_rate": 750.0,
            "customer_sale_rate": 780.0,
            "risk_premium": True,
            "supplier_payment_due": (datetime.now() + timedelta(days=30)).isoformat(),
            "customer_collection_date": (datetime.now() + timedelta(days=45)).isoformat()
        }
        
        success, result = self.make_request('POST', 'trades', trade_data, 201)
        
        if success:
            trade_id = result.get('id')
            commission = result.get('final_commission', 0)
            self.test_trade_id = trade_id  # Update for later tests
            self.log_test("Create Trade", True, 
                         f"Trade ID: {trade_id}, Final Commission: ${commission:.2f}")
        else:
            self.log_test("Create Trade", False, result)
        
        return success

    def test_update_trade(self):
        """Test updating a trade"""
        if not self.test_trade_id:
            self.log_test("Update Trade", False, "No trade ID available")
            return False
        
        update_data = {
            "supplier_paid": True,
            "customer_collected": False,
            "claims": 1
        }
        
        success, result = self.make_request('PUT', f'trades/{self.test_trade_id}', 
                                          update_data, 200)
        
        if success:
            supplier_paid = result.get('supplier_paid', False)
            claims = result.get('claims', 0)
            self.log_test("Update Trade", True, 
                         f"Supplier paid: {supplier_paid}, Claims: {claims}")
        else:
            self.log_test("Update Trade", False, result)
        
        return success

    def test_dashboard_summary(self):
        """Test dashboard summary endpoint"""
        success, result = self.make_request('GET', 'dashboard/summary', expected_status=200)
        
        if success:
            total_trades = result.get('total_trades', 0)
            total_commission = result.get('total_commission', 0)
            self.log_test("Dashboard Summary", True, 
                         f"Trades: {total_trades}, Commission: ${total_commission:.2f}")
        else:
            self.log_test("Dashboard Summary", False, result)
        
        return success

    def test_dashboard_heatmap(self):
        """Test dashboard heatmap endpoint"""
        success, result = self.make_request('GET', 'dashboard/heatmap', expected_status=200)
        
        if success:
            heatmap_items = result if isinstance(result, list) else []
            self.log_test("Dashboard Heatmap", True, f"Found {len(heatmap_items)} items")
        else:
            self.log_test("Dashboard Heatmap", False, result)
        
        return success

    def test_generate_notifications(self):
        """Test notification generation"""
        success, result = self.make_request('POST', 'notifications/generate', expected_status=200)
        
        if success:
            generated = result.get('generated', 0)
            self.log_test("Generate Notifications", True, f"Generated {generated} notifications")
        else:
            self.log_test("Generate Notifications", False, result)
        
        return success

    def test_get_notifications(self):
        """Test getting notifications"""
        success, result = self.make_request('GET', 'notifications', expected_status=200)
        
        if success:
            notifications = result if isinstance(result, list) else []
            self.log_test("Get Notifications", True, f"Found {len(notifications)} notifications")
        else:
            self.log_test("Get Notifications", False, result)
        
        return success

    def test_analytics_suppliers(self):
        """Test supplier analytics"""
        success, result = self.make_request('GET', 'analytics/suppliers', expected_status=200)
        
        if success:
            suppliers = result if isinstance(result, list) else []
            self.log_test("Analytics - Suppliers", True, f"Found {len(suppliers)} suppliers")
        else:
            self.log_test("Analytics - Suppliers", False, result)
        
        return success

    def test_analytics_customers(self):
        """Test customer analytics"""
        success, result = self.make_request('GET', 'analytics/customers', expected_status=200)
        
        if success:
            customers = result if isinstance(result, list) else []
            self.log_test("Analytics - Customers", True, f"Found {len(customers)} customers")
        else:
            self.log_test("Analytics - Customers", False, result)
        
        return success

    def test_analytics_cashflow(self):
        """Test cash flow analytics"""
        success, result = self.make_request('GET', 'analytics/cashflow', expected_status=200)
        
        if success:
            inflow = result.get('total_inflow', 0)
            outflow = result.get('total_outflow', 0)
            net_position = result.get('net_position', 0)
            self.log_test("Analytics - Cash Flow", True, 
                         f"Inflow: ${inflow:.2f}, Outflow: ${outflow:.2f}, Net: ${net_position:.2f}")
        else:
            self.log_test("Analytics - Cash Flow", False, result)
        
        return success

    def test_delete_trade(self):
        """Test deleting a trade (run last)"""
        if not self.test_trade_id:
            self.log_test("Delete Trade", False, "No trade ID available")
            return False
        
        success, result = self.make_request('DELETE', f'trades/{self.test_trade_id}', 
                                          expected_status=200)
        
        if success:
            self.log_test("Delete Trade", True, "Trade deleted successfully")
        else:
            self.log_test("Delete Trade", False, result)
        
        return success

    def run_all_tests(self):
        """Run comprehensive test suite"""
        print("🚀 Starting Trade Tracker API Tests")
        print("=" * 60)
        
        # Core functionality tests
        tests = [
            self.test_health_check,
            self.test_register,
            self.test_login, 
            self.test_get_me,
            self.test_seed_demo_data,
            self.test_get_trades,
            self.test_create_trade,
            self.test_update_trade,
            self.test_dashboard_summary,
            self.test_dashboard_heatmap,
            self.test_generate_notifications,
            self.test_get_notifications,
            self.test_analytics_suppliers,
            self.test_analytics_customers,
            self.test_analytics_cashflow,
            self.test_delete_trade,
        ]
        
        # Run all tests
        for test in tests:
            test()
            print()  # Add spacing
        
        # Summary
        print("=" * 60)
        print(f"📊 TEST SUMMARY")
        print(f"Total Tests: {self.tests_run}")
        print(f"Passed: {self.tests_passed}")
        print(f"Failed: {self.tests_run - self.tests_passed}")
        print(f"Success Rate: {(self.tests_passed/self.tests_run)*100:.1f}%")
        
        if self.failed_tests:
            print(f"\n❌ FAILED TESTS:")
            for failure in self.failed_tests:
                print(f"   • {failure}")
        
        return self.tests_passed == self.tests_run

def main():
    """Main test runner"""
    tester = TradeTrackerAPITester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())