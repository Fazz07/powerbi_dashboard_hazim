// src/pages/Login.tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';
import { Facebook, Github, Linkedin, Mail } from 'lucide-react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();
  const { toast } = useToast();

  // Helper to create a "dummy" user identifier for tokens
  const createDummyUserIdentifier = (email: string) => {
    // Replace characters that might be problematic in a simple string token
    return email.replace(/@/g, '_at_').replace(/\./g, '_dot_');
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();

    if (email && password) {
      // Simulate loading
      setTimeout(() => {
        const dummyUserIdentifier = createDummyUserIdentifier(email);
        // Store some demo user data, INCLUDING a dummy id_token
        localStorage.setItem('user', JSON.stringify({
          email,
          name: email.split('@')[0],
          id_token: `dummy-jwt-token-for-user-${dummyUserIdentifier}`, // <--- MODIFIED DUMMY TOKEN
        }));

        toast({
          title: 'Login successful',
          description: 'Welcome to the PowerBI Dashboard',
          variant: 'destructive',
        });

        navigate('/');
      }, 1000);
    } else {
      toast({
        title: 'Error',
        description: 'Please enter your email and password',
        variant: 'destructive',
      });
    }
  };

  const handleSocialLogin = (provider: string) => {
    toast({
      title: `${provider} login`,
      description: `Redirecting to ${provider} for authentication...`,
      variant: 'destructive',
    });

    // Simulate successful login after a delay
    setTimeout(() => {
      const dummyEmail = `user@${provider.toLowerCase()}.com`;
      const dummyUserIdentifier = createDummyUserIdentifier(dummyEmail);
      localStorage.setItem('user', JSON.stringify({
        email: dummyEmail,
        name: `${provider}User`,
        id_token: `dummy-jwt-token-for-user-${dummyUserIdentifier}`, // <--- MODIFIED DUMMY TOKEN
      }));

      toast({
        title: 'Login successful',
        description: `Welcome back, ${provider}User!`,
        variant: 'destructive',
      });

      navigate('/');
    }, 1500);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-cyan-100 dark:from-gray-900 dark:via-gray-950 dark:to-gray-800 p-4">
      <Card className="w-full max-w-md shadow-xl rounded-xl">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">PowerBI Dashboard</CardTitle>
          <CardDescription className="text-center">
            Enter your credentials to access your dashboard
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleLogin}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="your.email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="rounded-md"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <a href="#" className="text-xs text-primary hover:underline">
                  Forgot password?
                </a>
              </div>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="rounded-md"
              />
            </div>
            <Button type="submit" className="w-full rounded-md">
              Sign In with Email
            </Button>

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <Separator className="w-full" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <Button
                variant="outline"
                className="w-full rounded-md"
                onClick={() => handleSocialLogin('Github')}
              >
                <Github className="mr-2 h-4 w-4" />
                Github
              </Button>
              <Button
                variant="outline"
                className="w-full rounded-md"
                onClick={() => handleSocialLogin('LinkedIn')}
              >
                <Linkedin className="mr-2 h-4 w-4" />
                LinkedIn
              </Button>
              <Button
                variant="outline"
                className="w-full bg-blue-50 hover:bg-blue-100 dark:bg-blue-950 dark:hover:bg-blue-900 rounded-md"
                onClick={() => handleSocialLogin('Facebook')}
              >
                <Facebook className="mr-2 h-4 w-4" />
                Facebook
              </Button>
            </div>
          </CardContent>
        </form>
        <CardFooter className="flex flex-col">
          <div className="mt-4 text-center text-sm">
            <span>Don't have an account? </span>
            <a href="#" className="text-primary hover:underline">
              Sign up
            </a>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
};

export default Login;