import { Link } from "react-router-dom";

export default function Privacy() {
  return (
    <div className="min-h-screen landing-gradient px-4 py-8">
      <div className="max-w-4xl mx-auto bg-white p-8 rounded-lg shadow-sm">
        <div className="text-center mb-8">
          <Link to="/" className="inline-block">
            <h1 className="text-3xl font-medium text-second">Second Light</h1>
          </Link>
          <h2 className="text-2xl font-semibold mt-4 text-dark">Privacy Policy</h2>
          <p className="text-dark-light mt-2">Effective Date: May 19, 2025</p>
        </div>

        <div className="prose max-w-none text-dark">
          <h3 className="text-xl font-semibold text-second mt-6 mb-3">1. Introduction</h3>
          <p className="text-base leading-relaxed">Second Light ("we," "our," or "us") respects your privacy. This Privacy Policy explains how we collect, use, and protect your information when you use our website and services.</p>

          <h3 className="text-xl font-semibold text-second mt-6 mb-3">2. Data Collection</h3>
          <p className="text-base leading-relaxed">We collect and process the information you provide when you:</p>
          <ul className="list-disc pl-6 space-y-2 text-base leading-relaxed">
            <li>Upload medical reports or scans for analysis</li>
            <li>Create an account or interact with our platform</li>
            <li>Contact us for support</li>
          </ul>
          <p className="text-base leading-relaxed mt-3">This data may include sensitive health data, which you consent to share for the purpose of receiving insights and results through our service.</p>

          <h3 className="text-xl font-semibold text-second mt-6 mb-3">3. Use of Data</h3>
          <p className="text-base leading-relaxed">All data submitted is used solely to provide informational, educational, and entertainment-based summaries and interpretations. These are not a substitute for professional medical advice.</p>
          <p className="text-base leading-relaxed mt-3">We may also use anonymized data to improve our models and services.</p>

          <h3 className="text-xl font-semibold text-second mt-6 mb-3">4. Legal Basis and Consent</h3>
          <p className="text-base leading-relaxed">By using our service and submitting information, you provide explicit, informed consent for us to:</p>
          <ul className="list-disc pl-6 space-y-2 text-base leading-relaxed">
            <li>Process your health-related data</li>
            <li>Store your data on servers operated by third-party services (e.g., Supabase, OpenAI)</li>
            <li>Deliver results and insights based on that data</li>
          </ul>

          <h3 className="text-xl font-semibold text-second mt-6 mb-3">5. Data Sharing</h3>
          <p className="text-base leading-relaxed">We do not sell or share your personal data with third parties for advertising. Your data may be shared only with our processors necessary to deliver the service.</p>

          <h3 className="text-xl font-semibold text-second mt-6 mb-3">6. Data Retention</h3>
          <p className="text-base leading-relaxed">We retain data as long as necessary to provide our service or as required by law. You may request deletion of your data at any time by contacting us.</p>

          <h3 className="text-xl font-semibold text-second mt-6 mb-3">7. Your Rights</h3>
          <p className="text-base leading-relaxed">If you reside in the EU, you have the right to access, correct, delete, or limit the processing of your personal data. To exercise these rights, email us at <a href="mailto:info@secondlight.health" className="text-second hover:underline">info@secondlight.health</a>.</p>

          <h3 className="text-xl font-semibold text-second mt-6 mb-3">8. Data Security</h3>
          <p className="text-base leading-relaxed">We implement industry-standard security measures. However, no system is entirely secure. You acknowledge and accept this risk by using our service.</p>

          <h3 className="text-xl font-semibold text-second mt-6 mb-3">9. International Users</h3>
          <p className="text-base leading-relaxed">Your data may be processed outside your jurisdiction. By using our service, you consent to such processing.</p>

          <h3 className="text-xl font-semibold text-second mt-6 mb-3">10. Contact Information</h3>
          <p className="text-base leading-relaxed">For any questions, email us at <a href="mailto:info@secondlight.health" className="text-second hover:underline">info@secondlight.health</a>.</p>

          <h3 className="text-xl font-semibold text-second mt-6 mb-3">11. Changes to This Policy</h3>
          <p className="text-base leading-relaxed">We may update this Privacy Policy. Continued use of our service after changes implies your acceptance.</p>

          <p className="mt-8 text-base leading-relaxed"><strong className="text-second">Jurisdiction:</strong> This policy is governed under the laws of Greece.</p>
        </div>
      </div>
    </div>
  );
} 