import requests
import sys
import json
import base64
from datetime import datetime
import os

class EventPhotoAPITester:
    def __init__(self, base_url="https://photosortai.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.admin_token = None
        self.test_gallery_id = None
        self.test_user_name = None
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []

    def run_test(self, name, method, endpoint, expected_status, data=None, files=None, headers=None):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        
        if headers:
            test_headers.update(headers)
        
        if self.admin_token and 'admin' in endpoint:
            test_headers['Authorization'] = f'Bearer {self.admin_token}'

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers)
            elif method == 'POST':
                if files:
                    # Remove Content-Type for multipart/form-data
                    if 'Content-Type' in test_headers:
                        del test_headers['Content-Type']
                    response = requests.post(url, files=files, headers=test_headers)
                else:
                    response = requests.post(url, json=data, headers=test_headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    return success, response.json()
                except:
                    return success, response.text
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                print(f"   Response: {response.text[:200]}...")
                self.failed_tests.append({
                    "test": name,
                    "expected": expected_status,
                    "actual": response.status_code,
                    "response": response.text[:200]
                })
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            self.failed_tests.append({
                "test": name,
                "error": str(e)
            })
            return False, {}

    def create_test_face_image(self):
        """Create a simple base64 encoded test image"""
        # Create a minimal 1x1 pixel image in base64
        # This is a 1x1 red pixel PNG
        test_image_b64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=="
        return f"data:image/png;base64,{test_image_b64}"

    def test_root_endpoint(self):
        """Test root API endpoint"""
        success, response = self.run_test(
            "Root API Endpoint",
            "GET",
            "",
            200
        )
        return success

    def test_user_registration(self):
        """Test user registration with face capture"""
        test_image = self.create_test_face_image()
        timestamp = datetime.now().strftime('%H%M%S')
        
        success, response = self.run_test(
            "User Registration",
            "POST",
            "register",
            200,
            data={
                "name": f"Test User {timestamp}",
                "email": f"test{timestamp}@example.com",
                "phone": f"555-{timestamp}",
                "face_image_data": test_image
            }
        )
        
        if success and 'gallery_id' in response:
            self.test_gallery_id = response['gallery_id']
            self.test_user_name = response['name']
            print(f"   Gallery ID: {self.test_gallery_id}")
            return True
        return False

    def test_duplicate_email_registration(self):
        """Test that duplicate email registration is prevented"""
        test_image = self.create_test_face_image()
        timestamp = datetime.now().strftime('%H%M%S')
        
        # First registration
        email = f"duplicate{timestamp}@example.com"
        self.run_test(
            "First Registration",
            "POST",
            "register",
            200,
            data={
                "name": f"First User {timestamp}",
                "email": email,
                "phone": f"555-{timestamp}1",
                "face_image_data": test_image
            }
        )
        
        # Duplicate registration should fail
        success, response = self.run_test(
            "Duplicate Email Registration",
            "POST",
            "register",
            400,
            data={
                "name": f"Second User {timestamp}",
                "email": email,
                "phone": f"555-{timestamp}2",
                "face_image_data": test_image
            }
        )
        return success

    def test_gallery_access(self):
        """Test gallery access with gallery ID"""
        if not self.test_gallery_id:
            print("❌ No gallery ID available for testing")
            return False
            
        success, response = self.run_test(
            "Gallery Access",
            "GET",
            f"gallery/{self.test_gallery_id}",
            200
        )
        
        if success:
            print(f"   User Name: {response.get('user_name')}")
            print(f"   Images Count: {len(response.get('images', []))}")
            return True
        return False

    def test_invalid_gallery_access(self):
        """Test access to non-existent gallery"""
        success, response = self.run_test(
            "Invalid Gallery Access",
            "GET",
            "gallery/invalid123",
            404
        )
        return success

    def test_qr_code_generation(self):
        """Test QR code generation"""
        if not self.test_gallery_id:
            print("❌ No gallery ID available for QR code testing")
            return False
            
        success, response = self.run_test(
            "QR Code Generation",
            "GET",
            f"qrcode/{self.test_gallery_id}",
            200
        )
        return success

    def test_admin_login(self):
        """Test admin login with default credentials"""
        success, response = self.run_test(
            "Admin Login",
            "POST",
            "admin/login",
            200,
            data={
                "email": "admin@event.com",
                "password": "admin123"
            }
        )
        
        if success and 'token' in response:
            self.admin_token = response['token']
            print(f"   Admin token received")
            return True
        return False

    def test_admin_invalid_login(self):
        """Test admin login with invalid credentials"""
        success, response = self.run_test(
            "Admin Invalid Login",
            "POST",
            "admin/login",
            401,
            data={
                "email": "admin@event.com",
                "password": "wrongpassword"
            }
        )
        return success

    def test_admin_stats(self):
        """Test admin dashboard stats"""
        success, response = self.run_test(
            "Admin Dashboard Stats",
            "GET",
            "admin/stats",
            200
        )
        
        if success:
            print(f"   Total Users: {response.get('total_users')}")
            print(f"   Total Images: {response.get('total_images')}")
            print(f"   Processed Images: {response.get('processed_images')}")
            print(f"   Pending Images: {response.get('pending_images')}")
            return True
        return False

    def test_admin_users_list(self):
        """Test admin users list"""
        success, response = self.run_test(
            "Admin Users List",
            "GET",
            "admin/users",
            200
        )
        
        if success:
            print(f"   Users returned: {len(response) if isinstance(response, list) else 'N/A'}")
            return True
        return False

    def test_admin_images_list(self):
        """Test admin images list"""
        success, response = self.run_test(
            "Admin Images List",
            "GET",
            "admin/images",
            200
        )
        
        if success:
            print(f"   Images returned: {len(response) if isinstance(response, list) else 'N/A'}")
            return True
        return False

    def test_admin_image_upload(self):
        """Test admin image upload functionality"""
        # Create a test image file
        test_image_content = base64.b64decode("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==")
        
        files = {
            'files': ('test_image.png', test_image_content, 'image/png')
        }
        
        success, response = self.run_test(
            "Admin Image Upload",
            "POST",
            "admin/upload",
            200,
            files=files
        )
        
        if success:
            print(f"   Uploaded files: {response.get('uploaded_count')}")
            return True
        return False

    def test_admin_process_images(self):
        """Test admin face recognition processing trigger"""
        success, response = self.run_test(
            "Admin Process Images",
            "POST",
            "admin/process",
            200
        )
        
        if success:
            print(f"   Processing message: {response.get('message')}")
            return True
        return False

def main():
    print("🚀 Starting Event Photo Face Recognition API Tests")
    print("=" * 60)
    
    tester = EventPhotoAPITester()
    
    # Test sequence
    tests = [
        tester.test_root_endpoint,
        tester.test_user_registration,
        tester.test_duplicate_email_registration,
        tester.test_gallery_access,
        tester.test_invalid_gallery_access,
        tester.test_qr_code_generation,
        tester.test_admin_login,
        tester.test_admin_invalid_login,
        tester.test_admin_stats,
        tester.test_admin_users_list,
        tester.test_admin_images_list,
        tester.test_admin_image_upload,
        tester.test_admin_process_images,
    ]
    
    # Run all tests
    for test in tests:
        try:
            test()
        except Exception as e:
            print(f"❌ Test {test.__name__} failed with exception: {e}")
            tester.failed_tests.append({
                "test": test.__name__,
                "error": str(e)
            })
    
    # Print results
    print("\n" + "=" * 60)
    print("📊 TEST RESULTS")
    print("=" * 60)
    print(f"Tests Run: {tester.tests_run}")
    print(f"Tests Passed: {tester.tests_passed}")
    print(f"Tests Failed: {tester.tests_run - tester.tests_passed}")
    print(f"Success Rate: {(tester.tests_passed / tester.tests_run * 100):.1f}%" if tester.tests_run > 0 else "0%")
    
    if tester.failed_tests:
        print("\n❌ FAILED TESTS:")
        for failure in tester.failed_tests:
            print(f"   - {failure.get('test', 'Unknown')}: {failure.get('error', failure.get('response', 'Unknown error'))}")
    
    print(f"\n🎯 Test Gallery ID: {tester.test_gallery_id}")
    print(f"👤 Test User: {tester.test_user_name}")
    
    return 0 if tester.tests_passed == tester.tests_run else 1

if __name__ == "__main__":
    sys.exit(main())