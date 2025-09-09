import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy Policy - Splintr',
  description: 'Privacy Policy for Splintr interactive storytelling platform',
}

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow-lg rounded-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Privacy Policy</h1>
          
          <div className="prose prose-lg max-w-none">
            <p className="text-gray-600 mb-6">
              <strong>Last updated:</strong> {new Date().toLocaleDateString()}
            </p>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. Information We Collect</h2>
              
              <h3 className="text-xl font-medium text-gray-800 mb-3">Personal Information</h3>
              <ul className="list-disc pl-6 mb-4 text-gray-700">
                <li>Name and email address (from Google/Apple OAuth)</li>
                <li>Profile picture (optional)</li>
                <li>Account creation and last sign-in dates</li>
              </ul>

              <h3 className="text-xl font-medium text-gray-800 mb-3">Content Data</h3>
              <ul className="list-disc pl-6 mb-4 text-gray-700">
                <li>Videos you upload (15-30 second clips)</li>
                <li>Interactive stories you create</li>
                <li>Story titles and descriptions</li>
                <li>Content moderation results</li>
              </ul>

              <h3 className="text-xl font-medium text-gray-800 mb-3">Usage Data</h3>
              <ul className="list-disc pl-6 mb-4 text-gray-700">
                <li>Stories you view and interact with</li>
                <li>Choices made in interactive stories</li>
                <li>Content you report or flag</li>
                <li>App usage analytics and performance data</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. How We Use Your Information</h2>
              <ul className="list-disc pl-6 mb-4 text-gray-700">
                <li>Provide and maintain the Splintr service</li>
                <li>Process and store your interactive stories</li>
                <li>Moderate content for safety and compliance</li>
                <li>Personalize your feed and recommendations</li>
                <li>Communicate with you about your account</li>
                <li>Improve our services and user experience</li>
                <li>Comply with legal obligations</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. Information Sharing</h2>
              <p className="text-gray-700 mb-4">
                We do not sell your personal information. We may share your information in the following circumstances:
              </p>
              <ul className="list-disc pl-6 mb-4 text-gray-700">
                <li><strong>Public Content:</strong> Stories you publish are visible to other users</li>
                <li><strong>Service Providers:</strong> Third-party services that help us operate (Cloudinary, Supabase, etc.)</li>
                <li><strong>Legal Requirements:</strong> When required by law or to protect our rights</li>
                <li><strong>Business Transfers:</strong> In connection with mergers or acquisitions</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. Data Storage and Security</h2>
              <ul className="list-disc pl-6 mb-4 text-gray-700">
                <li>Data is stored securely using industry-standard encryption</li>
                <li>Videos are processed and stored by Cloudinary</li>
                <li>User data is stored in Supabase (PostgreSQL)</li>
                <li>All data transmission uses HTTPS encryption</li>
                <li>Regular security audits and monitoring</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. Your Rights and Choices</h2>
              
              <h3 className="text-xl font-medium text-gray-800 mb-3">Data Access and Portability</h3>
              <p className="text-gray-700 mb-4">
                You can request a copy of all your personal data by visiting your account settings 
                and clicking "Export My Data". This will provide a comprehensive JSON file containing 
                all your information.
              </p>

              <h3 className="text-xl font-medium text-gray-800 mb-3">Account Deletion</h3>
              <p className="text-gray-700 mb-4">
                You can delete your account at any time from your account settings. This will 
                permanently remove all your data, including:
              </p>
              <ul className="list-disc pl-6 mb-4 text-gray-700">
                <li>Your profile and account information</li>
                <li>All videos and stories you've created</li>
                <li>Your viewing history and interactions</li>
                <li>Content flags and reports you've made</li>
              </ul>

              <h3 className="text-xl font-medium text-gray-800 mb-3">Content Control</h3>
              <ul className="list-disc pl-6 mb-4 text-gray-700">
                <li>You can delete individual stories or videos</li>
                <li>You can make stories private or public</li>
                <li>You can report inappropriate content</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. Cookies and Tracking</h2>
              <p className="text-gray-700 mb-4">
                We use essential cookies for authentication and session management. We also use:
              </p>
              <ul className="list-disc pl-6 mb-4 text-gray-700">
                <li><strong>Authentication cookies:</strong> To keep you signed in</li>
                <li><strong>Preference cookies:</strong> To remember your settings</li>
                <li><strong>Analytics cookies:</strong> To understand how you use our app (with your consent)</li>
              </ul>
              <p className="text-gray-700 mb-4">
                You can manage cookie preferences in your browser settings or through our cookie consent banner.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. Children's Privacy</h2>
              <p className="text-gray-700 mb-4">
                Splintr is not intended for children under 13. We do not knowingly collect personal 
                information from children under 13. If we become aware that we have collected personal 
                information from a child under 13, we will take steps to delete such information.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">8. International Data Transfers</h2>
              <p className="text-gray-700 mb-4">
                Your information may be transferred to and processed in countries other than your own. 
                We ensure appropriate safeguards are in place to protect your personal information 
                in accordance with applicable data protection laws.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">9. Changes to This Policy</h2>
              <p className="text-gray-700 mb-4">
                We may update this Privacy Policy from time to time. We will notify you of any 
                material changes by posting the new Privacy Policy on this page and updating the 
                "Last updated" date.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">10. Contact Us</h2>
              <p className="text-gray-700 mb-4">
                If you have any questions about this Privacy Policy or our data practices, please contact us at:
              </p>
              <div className="bg-gray-100 p-4 rounded-lg">
                <p className="text-gray-700">
                  <strong>Email:</strong> privacy@splintr.app<br />
                  <strong>Subject:</strong> Privacy Policy Inquiry
                </p>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}