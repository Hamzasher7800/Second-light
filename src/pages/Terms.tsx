import { Link } from "react-router-dom";

export default function Terms() {
  return (
    <div className="min-h-screen landing-gradient px-4 py-8">
      <div className="max-w-4xl mx-auto bg-white p-8 rounded-lg shadow-sm">
        <div className="text-center mb-8">
          <Link to="/" className="inline-block">
            <h1 className="text-3xl font-medium text-second">Second Light</h1>
          </Link>
          <h2 className="text-2xl font-semibold mt-4 text-dark">Terms and Conditions</h2>
          <p className="text-dark-light mt-2">Effective Date: May 19, 2025</p>
        </div>

        <div className="prose max-w-none text-dark">
          <h3 className="text-xl font-semibold text-second mt-6 mb-3">1. Acceptance of Terms</h3>
          <p className="text-base leading-relaxed">By using Second Light ("the Service"), you agree to be bound by these Terms and Conditions. If you do not agree, do not use the Service.</p>

          <h3 className="text-xl font-semibold text-second mt-6 mb-3">2. Nature of the Service</h3>
          <p className="text-base leading-relaxed">Second Light provides AI-generated summaries and interpretations of medical documents. The Service is:</p>
          <ul className="list-disc pl-6 space-y-2 text-base leading-relaxed">
            <li>Informational</li>
            <li>Educational</li>
            <li>Entertainment-based</li>
          </ul>
          <p className="text-base leading-relaxed mt-3">It is not a substitute for professional medical advice, diagnosis, or treatment. Always consult with a licensed healthcare provider.</p>

          <h3 className="text-xl font-semibold text-second mt-6 mb-3">3. No Liability</h3>
          <p className="text-base leading-relaxed">We do not accept any liability for reliance on information provided through our Service. You use Second Light at your own risk.</p>

          <h3 className="text-xl font-semibold text-second mt-6 mb-3">4. Intellectual Property</h3>
          <p className="text-base leading-relaxed">All content and materials produced by Second Light remain our intellectual property. You may not redistribute or sell these results.</p>

          <h3 className="text-xl font-semibold text-second mt-6 mb-3">5. User Obligations</h3>
          <p className="text-base leading-relaxed">You agree not to:</p>
          <ul className="list-disc pl-6 space-y-2 text-base leading-relaxed">
            <li>Use the Service to violate any law or regulation</li>
            <li>Submit fraudulent or misleading data</li>
            <li>Resell or exploit the Service commercially without written permission</li>
          </ul>

          <h3 className="text-xl font-semibold text-second mt-6 mb-3">6. Limitation of Liability</h3>
          <p className="text-base leading-relaxed">To the maximum extent allowed under applicable law, Second Light disclaims any and all liability for damages arising from the use of the Service.</p>

          <h3 className="text-xl font-semibold text-second mt-6 mb-3">7. Termination</h3>
          <p className="text-base leading-relaxed">We reserve the right to suspend or terminate your access to the Service at our discretion.</p>

          <h3 className="text-xl font-semibold text-second mt-6 mb-3">8. Governing Law</h3>
          <p className="text-base leading-relaxed">These Terms are governed by and construed in accordance with the laws of Greece. Any disputes shall be resolved in Greek courts.</p>

          <h3 className="text-xl font-semibold text-second mt-6 mb-3">9. Contact</h3>
          <p className="text-base leading-relaxed">For inquiries regarding these Terms, contact <a href="mailto:info@secondlight.health" className="text-second hover:underline">info@secondlight.health</a>.</p>

          <p className="mt-8 text-base leading-relaxed"><strong className="text-second">Jurisdiction:</strong> This policy is governed under the laws of Greece.</p>
        </div>
      </div>
    </div>
  );
} 