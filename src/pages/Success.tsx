import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const Success = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect to dashboard after 3 seconds
    const timer = setTimeout(() => {
      navigate("/dashboard");
    }, 3000);
    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center" }}>
      <h1 style={{ fontSize: "2rem", color: "#16a34a" }}>🎉 Payment Successful!</h1>
      <p style={{ marginTop: 16, fontSize: "1.2rem" }}>
        Thank you for your purchase. You will be redirected to your dashboard shortly.
      </p>
    </div>
  );
};

export default Success;
