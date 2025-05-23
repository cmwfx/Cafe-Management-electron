
import { AuthForm } from "@/components/auth-form";

const Login = () => {
  return (
    <div className="flex min-h-screen items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-background/90 to-background">
      <AuthForm isLogin={true} />
    </div>
  );
};

export default Login;
