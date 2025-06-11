import { useParams, Link } from "react-router-dom";
import Sidebar from "@/components/Sidebar";
import DashboardHeader from "@/components/DashboardHeader";
import MobileMenu from "@/components/MobileMenu";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowDown, FileText, ArrowLeft, Loader2 } from "lucide-react";
import { useDocumentDetail } from "@/hooks/useDocuments";
import { Skeleton } from "@/components/ui/skeleton";
import { useState, useEffect } from "react";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import jsPDF from "jspdf";
import { supabase } from "@/integrations/supabase/client";

const DocumentDetail = () => {
  const { id = "" } = useParams<{ id: string }>();
  const { document: doc, isLoading, error, refetchDocument } = useDocumentDetail(id);
  const [isProcessing, setIsProcessing] = useState(false);
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<{ status: string } | null>(null);
  const [isLoadingSubscription, setIsLoadingSubscription] = useState(true);
  const [fileUrl, setFileUrl] = useState<string | null>(null);

  // Add logging
  useEffect(() => {
    console.log("Current user:", user);
    if (doc) {
      console.log("Document user_id:", doc.user_id);
    }
  }, [user, doc]);

  useEffect(() => {
    console.log("Document state:", {
      id,
      doc,
      isLoading,
      error,
      isProcessing
    });
  }, [id, doc, isLoading, error, isProcessing]);

  // Poll for document updates if it's still processing
  useEffect(() => {
    if (doc?.processing_status === "processing" || doc?.status === "Processing") {
      setIsProcessing(true);
      const interval = setInterval(() => {
        refetchDocument();
      }, 5000); // Poll every 5 seconds
      
      return () => clearInterval(interval);
    } else {
      setIsProcessing(false);
    }
  }, [doc, refetchDocument]);

  // Show toast when processing completes
  useEffect(() => {
    if (doc?.processing_status === "completed" && isProcessing) {
      setIsProcessing(false);
      toast({
        title: "Document Ready",
        description: "Your document has been analyzed successfully.",
      });
    } else if (doc?.processing_status === "error" && isProcessing) {
      setIsProcessing(false);
      toast({
        title: "Processing Error",
        description: doc.error_message || "There was an error processing your document.",
        variant: "destructive",
      });
    }
  }, [doc, isProcessing]);

  useEffect(() => {
    const fetchSubscriptionStatus = async () => {
      if (!user) return;
      try {
        const { data, error } = await supabase.functions.invoke('stripe-payment', {
          body: { type: 'get-subscription', userId: user.id }
        });
        if (error) throw error;
        setSubscription(data);
      } catch (error) {
        setSubscription(null);
      } finally {
        setIsLoadingSubscription(false);
      }
    };
    fetchSubscriptionStatus();
  }, [user]);

  // Generate public or signed URL for the original file
  useEffect(() => {
    const getFileUrl = async () => {
      if (doc && 'file_path' in doc && doc.file_path) {
        // Try to get a public URL first
        const publicResult = supabase.storage.from('documents').getPublicUrl(doc.file_path);
        if (publicResult.data?.publicUrl) {
          setFileUrl(publicResult.data.publicUrl);
        } else {
          // If the bucket is private, try to get a signed URL
          const signedResult = await supabase.storage.from('documents').createSignedUrl(doc.file_path, 60 * 60);
          if (signedResult.data?.signedUrl) {
            setFileUrl(signedResult.data.signedUrl);
          } else {
            setFileUrl(null);
          }
        }
      } else {
        setFileUrl(null);
      }
    };
    getFileUrl();
  }, [doc]);

  const handleDownloadReport = () => {
    if (!doc) return;

    // Create PDF with custom font size
    const pdf = new jsPDF();
    let y = 20; // Start a bit lower to accommodate header
    const pageWidth = pdf.internal.pageSize.getWidth();
    const contentWidth = pageWidth - 40; // 20mm margins on each side
    const leftMargin = 20;

    // Add title directly without waiting for logo
    // Document Title - Large and Bold
    pdf.setTextColor(51, 51, 51); // Dark gray for text
    pdf.setFontSize(24);
    const title = doc.title || "Medical Report";
    pdf.text(title, leftMargin, y);
    y += 15;

    // Date - Smaller size, muted color
    pdf.setTextColor(128, 128, 128); // Gray for date
    pdf.setFontSize(12);
    pdf.text(`Date: ${formattedDate}`, leftMargin, y);
    y += 20;

    // Section: Summary
    y = addSection(pdf, "Summary", doc.summary || "No summary available.", y, {
      leftMargin,
      contentWidth,
      sectionColor: "#1a1a1a",
      contentColor: "#333333"
    });
    y += 10;

    // Section: Key Findings
    pdf.setFontSize(16);
    pdf.setTextColor(26, 26, 26);
    pdf.text("Key Findings", leftMargin, y);
    y += 10;

    if (doc.key_findings && doc.key_findings.length > 0) {
      doc.key_findings.forEach(finding => {
        // Finding title
        pdf.setFontSize(12);
        pdf.setTextColor(51, 51, 51);
        const markerLines = pdf.splitTextToSize(`• ${finding.marker}`, contentWidth);
        pdf.text(markerLines, leftMargin, y);
        y += markerLines.length * 7;

        // Finding explanation
        pdf.setTextColor(89, 89, 89);
        const explanationLines = pdf.splitTextToSize(finding.explanation, contentWidth);
        pdf.text(explanationLines, leftMargin + 5, y);
        y += explanationLines.length * 6;
        y += 5; // Space between findings
      });
    } else {
      pdf.setTextColor(128, 128, 128);
      pdf.text("No key findings available.", leftMargin, y);
      y += 10;
    }
    y += 10;

    // Section: Recommendations
    pdf.setFontSize(16);
    pdf.setTextColor(26, 26, 26);
    pdf.text("Recommendations", leftMargin, y);
    y += 10;

    if (doc.recommendations && doc.recommendations.length > 0) {
      pdf.setFontSize(12);
      pdf.setTextColor(89, 89, 89);
      doc.recommendations.forEach(rec => {
        const recLines = pdf.splitTextToSize(`• ${rec}`, contentWidth);
        pdf.text(recLines, leftMargin, y);
        y += recLines.length * 6;
        y += 5; // Space between recommendations
      });
    } else {
      pdf.setTextColor(128, 128, 128);
      pdf.text("No recommendations available.", leftMargin, y);
      y += 10;
    }

    // Add footer with disclaimer
    const footerY = pdf.internal.pageSize.getHeight() - 20;
    pdf.setFontSize(8);
    pdf.setTextColor(128, 128, 128);
    const disclaimer = "This analysis is provided for educational purposes only and does not constitute medical advice. Always consult with a healthcare provider for proper diagnosis and treatment.";
    const disclaimerLines = pdf.splitTextToSize(disclaimer, contentWidth);
    pdf.text(disclaimerLines, leftMargin, footerY);

    // Add page border
    pdf.setDrawColor(230, 230, 230);
    pdf.setLineWidth(0.5);
    pdf.rect(10, 10, pageWidth - 20, pdf.internal.pageSize.getHeight() - 20);

    pdf.save(`${doc.title || "report"}.pdf`);
  };

  // Helper function to add a section with consistent styling
  const addSection = (
    pdf: jsPDF, 
    title: string, 
    content: string, 
    startY: number,
    options: {
      leftMargin: number;
      contentWidth: number;
      sectionColor: string;
      contentColor: string;
    }
  ) => {
    let y = startY;
    
    // Section title
    pdf.setFontSize(16);
    pdf.setTextColor(options.sectionColor);
    pdf.text(title, options.leftMargin, y);
    y += 10;

    // Section content
    pdf.setFontSize(12);
    pdf.setTextColor(options.contentColor);
    const contentLines = pdf.splitTextToSize(content, options.contentWidth);
    pdf.text(contentLines, options.leftMargin, y);
    y += contentLines.length * 6;

    return y;
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen">
        <Sidebar />
        
        <div className="flex-1 flex flex-col md:ml-64">
          <DashboardHeader />
          <MobileMenu />
          
          <main className="flex-1 p-6 md:p-8 overflow-y-auto dashboard-gradient">
            <div className="max-w-4xl mx-auto">
              <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Link to="/dashboard/documents" className="text-muted-foreground hover:text-foreground">
                      Documents
                    </Link>
                    <span className="text-muted-foreground">/</span>
                    <Skeleton className="h-6 w-32" />
                  </div>
                  <Skeleton className="h-9 w-64 mt-2" />
                  <Skeleton className="h-5 w-24 mt-2" />
                </div>
              </div>
              
              <Card className="mb-6 md:mb-8">
                <CardHeader>
                  <CardTitle>Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-6 w-full" />
                  <Skeleton className="h-6 w-full mt-2" />
                  <Skeleton className="h-5 w-24 mt-2" />
                </CardContent>
              </Card>
              
              <Card className="mb-6 md:mb-8">
                <CardHeader>
                  <CardTitle>Key Findings</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="border-b border-border pb-6 last:border-0 last:pb-0">
                        <Skeleton className="h-6 w-48 mb-2" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-5/6 mt-1" />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </main>
        </div>
      </div>
    );
  }

  // Handle document not found or error states
  if ((error && error !== 'null') || !doc) {
    return (
      <div className="flex min-h-screen">
        <Sidebar />
        
        <div className="flex-1 flex flex-col md:ml-64">
          <DashboardHeader />
          <MobileMenu />
          
          <main className="flex-1 p-6 md:p-8 overflow-y-auto dashboard-gradient">
            <div className="max-w-4xl mx-auto">
              <div className="flex items-center mb-8">
                <Link to="/dashboard/documents" className="flex items-center text-muted-foreground hover:text-foreground">
                  <ArrowLeft className="h-4 w-4 mr-2" /> Back to Documents
                </Link>
              </div>
              
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center mb-4">
                    <FileText className="h-6 w-6 text-red-600" />
                  </div>
                  <h2 className="text-xl font-medium mb-2">Document Not Found</h2>
                  <p className="text-muted-foreground mb-6">
                    {error || "The document may still be processing or doesn't exist."}
                  </p>
                  <Link to="/dashboard/documents">
                    <Button>Return to Documents</Button>
                  </Link>
                </CardContent>
              </Card>
            </div>
          </main>
        </div>
      </div>
    );
  }

  // Handle document still processing state
  if (doc.status === "Processing" || doc.processing_status === "processing" || 
      doc.processing_status === "pending") {
    return (
      <div className="flex min-h-screen">
        <Sidebar />
        
        <div className="flex-1 flex flex-col md:ml-64">
          <DashboardHeader />
          <MobileMenu />
          
          <main className="flex-1 p-6 md:p-8 overflow-y-auto dashboard-gradient">
            <div className="max-w-4xl mx-auto">
              <div className="flex items-center mb-8">
                <Link to="/dashboard/documents" className="flex items-center text-muted-foreground hover:text-foreground">
                  <ArrowLeft className="h-4 w-4 mr-2" /> Back to Documents
                </Link>
              </div>
              
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <div className="h-12 w-12 rounded-full bg-amber-100 flex items-center justify-center mb-4">
                    <Loader2 className="h-6 w-6 text-amber-600 animate-spin" />
                  </div>
                  <h2 className="text-xl font-medium mb-2">Processing Document</h2>
                  <p className="text-muted-foreground mb-6">
                    Your document is being analyzed by AI. This may take a minute or two.
                  </p>
                  <p className="text-sm text-muted-foreground mb-2">
                    This page will automatically update when processing is complete.
                  </p>
                </CardContent>
              </Card>
            </div>
          </main>
        </div>
      </div>
    );
  }

  // Restrict access if not subscribed
  if (!isLoadingSubscription && subscription?.status !== 'active') {
    return (
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex-1 flex flex-col md:ml-64">
          <DashboardHeader />
          <MobileMenu />
          <main className="flex-1 p-6 md:p-8 overflow-y-auto dashboard-gradient">
            <div className="max-w-4xl mx-auto flex flex-col items-center justify-center" style={{ minHeight: '60vh' }}>
              <h2 className="text-2xl font-semibold mb-4">Subscription Required</h2>
              <p className="mb-6 text-muted-foreground text-center">
                You need an active subscription to view document results. Please subscribe to unlock this feature.
              </p>
              <Link to="/dashboard/account">
                <Button>Go to Subscription Page</Button>
              </Link>
            </div>
          </main>
        </div>
      </div>
    );
  }

  const formattedDate = doc.date
    ? new Date(doc.date).toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      })
    : "Unknown date";

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      
      <div className="flex-1 flex flex-col md:ml-64">
        <DashboardHeader />
        <MobileMenu />
        
        <main className="flex-1 p-6 md:p-8 overflow-y-auto dashboard-gradient">
          <div className="max-w-4xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <Link to="/dashboard/documents" className="text-muted-foreground hover:text-foreground">
                    Documents
                  </Link>
                  <span className="text-muted-foreground">/</span>
                  <span className="truncate">{doc.title}</span>
                </div>
                <h1 className="text-2xl md:text-3xl font-medium mt-2 break-words">{doc.title}</h1>
                <p className="text-muted-foreground">{formattedDate}</p>
              </div>
              
              <div className="flex flex-wrap items-center gap-3">
                <a href={fileUrl} target="_blank" rel="noopener noreferrer">
                  <Button>View Original</Button>
                </a>
                <Button
                  className="bg-second hover:bg-second-dark text-dark w-full sm:w-auto"
                  onClick={handleDownloadReport}
                >
                  <ArrowDown className="h-4 w-4 mr-2" /> Download Report
                </Button>
              </div>
            </div>
            
            <Card className="mb-6 md:mb-8">
              <CardHeader>
                <CardTitle>Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <p>{doc.summary || "No summary available."}</p>
              </CardContent>
            </Card>
            
            <Card className="mb-6 md:mb-8">
              <CardHeader>
                <CardTitle>Key Findings</CardTitle>
              </CardHeader>
              <CardContent>
                {doc.key_findings && doc.key_findings.length > 0 ? (
                  <div className="space-y-6">
                    {doc.key_findings.map((finding, index) => (
                      <div key={index} className="border-b border-border pb-6 last:border-0 last:pb-0">
                        <h3 className="font-medium mb-2">{finding.marker}</h3>
                        <p className="text-sm text-muted-foreground">{finding.explanation}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">No findings available.</p>
                )}
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Recommendations</CardTitle>
              </CardHeader>
              <CardContent>
                {doc.recommendations && doc.recommendations.length > 0 ? (
                  <ul className="list-disc pl-5 space-y-2">
                    {doc.recommendations.map((recommendation, index) => (
                      <li key={index}>{recommendation}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-muted-foreground">No recommendations available.</p>
                )}
                
                <div className="mt-6 pt-6 border-t border-border text-sm text-muted-foreground">
                  <p>
                    This analysis is provided for educational purposes only and does not constitute medical advice. 
                    Always consult with a healthcare provider for proper diagnosis and treatment.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
};

export default DocumentDetail;
