import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Terms of Service - Splintr',
  description: 'Terms of Service for Splintr interactive storytelling platform',
}

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow-lg rounded-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Terms of Service</h1>
          
          <div className="prose prose-lg max-w-none">
            <p className="text-gray-600 mb-6">
              <strong>Last updated:</strong> {new Date().toLocaleDateString()}
            </p>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. Acceptance of Terms</h2>
              <p className="text-gray-700 mb-4">
                By accessing or using Splintr ("the Service"), you agree to be bound by these Terms of Service 
                ("Terms"). If you do not agree to these Terms, you may not use the Service.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. Description of Service</h2>
              <p className="text-gray-700 mb-4">
                Splintr is an interactive storytelling platform that allows users to:
              </p>
              <ul className="list-disc pl-6 mb-4 text-gray-700">
                <li>Create interactive, branching video stories</li>
                <li>Upload short video clips (15-30 seconds)</li>
                <li>View and interact with stories created by other users</li>
                <li>Discover content through a social feed</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. User Accounts</h2>
              
              <h3 className="text-xl font-medium text-gray-800 mb-3">Account Creation</h3>
              <ul className="list-disc pl-6 mb-4 text-gray-700">
                <li>You must be at least 13 years old to create an account</li>
                <li>You must provide accurate and complete information</li>
                <li>You are responsible for maintaining account security</li>
                <li>One person may not maintain multiple accounts</li>
              </ul>

              <h3 className="text-xl font-medium text-gray-800 mb-3">Account Responsibilities</h3>
              <ul className="list-disc pl-6 mb-4 text-gray-700">
                <li>You are responsible for all activity under your account</li>
                <li>You must notify us immediately of any unauthorized use</li>
                <li>You must not share your account credentials</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. Content Guidelines</h2>
              
              <h3 className="text-xl font-medium text-gray-800 mb-3">Acceptable Content</h3>
              <p className="text-gray-700 mb-4">You may upload content that is:</p>
              <ul className="list-disc pl-6 mb-4 text-gray-700">
                <li>Original content you own or have rights to use</li>
                <li>Appropriate for a general audience</li>
                <li>Compliant with applicable laws and regulations</li>
                <li>Between 15-30 seconds in duration</li>
                <li>Under 100MB in file size</li>
              </ul>

              <h3 className="text-xl font-medium text-gray-800 mb-3">Prohibited Content</h3>
              <p className="text-gray-700 mb-4">You may not upload content that:</p>
              <ul className="list-disc pl-6 mb-4 text-gray-700">
                <li>Contains nudity, sexual content, or adult material</li>
                <li>Promotes violence, hatred, or discrimination</li>
                <li>Infringes on intellectual property rights</li>
                <li>Contains spam, malware, or malicious code</li>
                <li>Violates privacy rights of others</li>
                <li>Contains false or misleading information</li>
                <li>Promotes illegal activities</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. Content Moderation</h2>
              <ul className="list-disc pl-6 mb-4 text-gray-700">
                <li>All content is subject to automated and manual moderation</li>
                <li>We reserve the right to remove content that violates these Terms</li>
                <li>Users can report inappropriate content</li>
                <li>Repeated violations may result in account suspension or termination</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. Intellectual Property</h2>
              
              <h3 className="text-xl font-medium text-gray-800 mb-3">Your Content</h3>
              <ul className="list-disc pl-6 mb-4 text-gray-700">
                <li>You retain ownership of content you upload</li>
                <li>You grant us a license to host, display, and distribute your content</li>
                <li>You represent that you have all necessary rights to your content</li>
              </ul>

              <h3 className="text-xl font-medium text-gray-800 mb-3">Our Platform</h3>
              <ul className="list-disc pl-6 mb-4 text-gray-700">
                <li>Splintr and its features are protected by intellectual property laws</li>
                <li>You may not copy, modify, or reverse engineer our platform</li>
                <li>Our trademarks and logos are our exclusive property</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. Privacy and Data</h2>
              <p className="text-gray-700 mb-4">
                Your privacy is important to us. Please review our Privacy Policy to understand 
                how we collect, use, and protect your information. By using the Service, you 
                consent to our data practices as described in the Privacy Policy.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">8. Prohibited Uses</h2>
              <p className="text-gray-700 mb-4">You agree not to:</p>
              <ul className="list-disc pl-6 mb-4 text-gray-700">
                <li>Use the Service for any unlawful purpose</li>
                <li>Attempt to gain unauthorized access to our systems</li>
                <li>Interfere with or disrupt the Service</li>
                <li>Use automated tools to access the Service without permission</li>
                <li>Impersonate others or provide false information</li>
                <li>Harass, abuse, or harm other users</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">9. Account Termination</h2>
              
              <h3 className="text-xl font-medium text-gray-800 mb-3">Termination by You</h3>
              <p className="text-gray-700 mb-4">
                You may delete your account at any time through your account settings. 
                Upon deletion, all your data will be permanently removed.
              </p>

              <h3 className="text-xl font-medium text-gray-800 mb-3">Termination by Us</h3>
              <p className="text-gray-700 mb-4">
                We may suspend or terminate your account if you violate these Terms, 
                engage in harmful behavior, or for any other reason at our discretion.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">10. Disclaimers</h2>
              <ul className="list-disc pl-6 mb-4 text-gray-700">
                <li>The Service is provided "as is" without warranties</li>
                <li>We do not guarantee uninterrupted or error-free service</li>
                <li>We are not responsible for user-generated content</li>
                <li>We do not endorse any content or opinions expressed by users</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">11. Limitation of Liability</h2>
              <p className="text-gray-700 mb-4">
                To the maximum extent permitted by law, Splintr shall not be liable for any 
                indirect, incidental, special, consequential, or punitive damages, including 
                but not limited to loss of profits, data, or use.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">12. Changes to Terms</h2>
              <p className="text-gray-700 mb-4">
                We may modify these Terms at any time. We will notify users of material changes 
                by posting the updated Terms on our platform. Continued use of the Service 
                constitutes acceptance of the modified Terms.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">13. Governing Law</h2>
              <p className="text-gray-700 mb-4">
                These Terms are governed by and construed in accordance with applicable laws. 
                Any disputes will be resolved through binding arbitration or in courts of 
                competent jurisdiction.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">14. Contact Information</h2>
              <p className="text-gray-700 mb-4">
                If you have questions about these Terms, please contact us at:
              </p>
              <div className="bg-gray-100 p-4 rounded-lg">
                <p className="text-gray-700">
                  <strong>Email:</strong> legal@splintr.app<br />
                  <strong>Subject:</strong> Terms of Service Inquiry
                </p>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}