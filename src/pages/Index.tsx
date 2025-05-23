
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { CheckCircle } from "lucide-react";
import Header from "@/components/Header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/contexts/AuthContext";

const Index = () => {
  const isMobile = useIsMobile();
  const { user } = useAuth();
  
  return (
    <div className="min-h-screen flex flex-col landing-gradient">
      <Header />
      
      <main className="flex-1 flex flex-col md:flex-row overflow-y-auto">
        {/* Hero Section (Left Side) */}
        <div className="w-full md:w-1/2 p-6 md:p-12 flex flex-col justify-center">
          <div className="max-w-xl">
            <h1 className="text-3xl md:text-5xl font-medium tracking-tighter text-dark mb-6">
              Clarity for your health.
              <br />
              Peace for your mind.
            </h1>
            <p className="text-lg md:text-xl text-dark-light mb-4 max-w-md">
              A second opinion can save lives.
              <br />
              Know what matters, in an instant.
            </p>
            
            <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4 mb-6">
              <Link to={user ? "/dashboard" : "/auth/login"}>
                <Button size="lg" className="bg-second hover:bg-second-dark text-dark px-6 py-5 text-base">
                  {user ? "Go to Dashboard" : "Get Your Insights"}
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Content Tabs (Right Side) */}
        <div className="w-full md:w-1/2 p-6 md:p-12 overflow-y-auto">
          <Tabs defaultValue="how-it-works" className="w-full">
            <TabsList className="w-full mb-6">
              <TabsTrigger value="how-it-works" className="flex-1">How It Works</TabsTrigger>
              <TabsTrigger value="what-we-offer" className="flex-1">What We Offer</TabsTrigger>
              <TabsTrigger value="pricing" className="flex-1">Pricing</TabsTrigger>
            </TabsList>

            {/* How It Works Tab */}
            <TabsContent value="how-it-works" className="mt-0">
              <div className="bg-white rounded-lg p-6 shadow-sm mb-4">
                <div className="grid grid-cols-1 gap-4">
                  <div className="flex items-center space-x-4">
                    <div className="h-10 w-10 bg-second/20 text-second rounded-full flex items-center justify-center text-lg font-medium flex-shrink-0">1</div>
                    <div>
                      <h3 className="text-lg font-medium">Upload Your Document</h3>
                      <p className="text-dark-light text-sm">Upload your medical files securely—blood tests, prescriptions, or doctor's notes.</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    <div className="h-10 w-10 bg-second/20 text-second rounded-full flex items-center justify-center text-lg font-medium flex-shrink-0">2</div>
                    <div>
                      <h3 className="text-lg font-medium">AI Analysis</h3>
                      <p className="text-dark-light text-sm">Our AI analyzes the document and explains medical terms, results, and implications.</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    <div className="h-10 w-10 bg-second/20 text-second rounded-full flex items-center justify-center text-lg font-medium flex-shrink-0">3</div>
                    <div>
                      <h3 className="text-lg font-medium">Get Clear Insights</h3>
                      <p className="text-dark-light text-sm">Receive an easy-to-understand report with actionable insights and suggestions.</p>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* What We Offer Tab */}
            <TabsContent value="what-we-offer" className="mt-0">
              <div className="bg-white rounded-lg p-6 shadow-sm">
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="item-1" className="border-b">
                    <AccordionTrigger className="py-4">
                      <div className="flex items-center">
                        <CheckCircle className="h-5 w-5 text-second mr-3 flex-shrink-0" />
                        <span className="text-base">Upload your medical documents</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pl-8">
                      Upload your blood test, prescription, or doctor's note quickly and securely.
                    </AccordionContent>
                  </AccordionItem>
                  
                  <AccordionItem value="item-2" className="border-b">
                    <AccordionTrigger className="py-4">
                      <div className="flex items-center">
                        <CheckCircle className="h-5 w-5 text-second mr-3 flex-shrink-0" />
                        <span className="text-base">AI explanations in plain English</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pl-8">
                      Our AI explains each marker or medication in plain English, so you understand what matters.
                    </AccordionContent>
                  </AccordionItem>
                  
                  <AccordionItem value="item-3" className="border-b">
                    <AccordionTrigger className="py-4">
                      <div className="flex items-center">
                        <CheckCircle className="h-5 w-5 text-second mr-3 flex-shrink-0" />
                        <span className="text-base">Understand causes and risks</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pl-8">
                      Understand possible causes, risks, and questions to ask your doctor at your next appointment.
                    </AccordionContent>
                  </AccordionItem>
                  
                  <AccordionItem value="item-4">
                    <AccordionTrigger className="py-4">
                      <div className="flex items-center">
                        <CheckCircle className="h-5 w-5 text-second mr-3 flex-shrink-0" />
                        <span className="text-base">Private and always available</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pl-8">
                      Private, fast, always available—like a personal health guide in your pocket, whenever you need it.
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </div>
            </TabsContent>

            {/* Pricing Tab */}
            <TabsContent value="pricing" className="mt-0">
              <div className="bg-white rounded-lg p-6 shadow-sm">
                <div className="text-center mb-4">
                  <h3 className="text-2xl font-medium mb-1">$9.99/month</h3>
                  <p className="text-dark-light text-sm">Cancel anytime</p>
                </div>
                
                <ul className="space-y-3 mb-6">
                  <li className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-second mr-3 flex-shrink-0" />
                    <span className="text-sm">30 reports per month</span>
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-second mr-3 flex-shrink-0" />
                    <span className="text-sm">AI-powered analysis and explanations</span>
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-second mr-3 flex-shrink-0" />
                    <span className="text-sm">Access to your upload history</span>
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-second mr-3 flex-shrink-0" />
                    <span className="text-sm">Secure, private document storage</span>
                  </li>
                </ul>
                
                <Link to={user ? "/dashboard" : "/auth/login"} className="block">
                  <Button className="w-full bg-second hover:bg-second-dark text-dark">
                    {user ? "Go to Dashboard" : "Get Your Insights"}
                  </Button>
                </Link>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>
      
      {/* Footer */}
      <div className="p-4 text-center text-xs text-dark-light border-t border-second/20">
        © {new Date().getFullYear()} Second Light. All rights reserved. 
        <span className="hidden md:inline"> | </span>
        <br className="md:hidden" />
        <span>Not a substitute for professional medical advice.</span>
      </div>
    </div>
  );
};

export default Index;
