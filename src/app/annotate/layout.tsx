import { SignInGate } from "@/components/SignInGate";

export default function Layout({ children }: { children: React.ReactNode }) {
  return <SignInGate>{children}</SignInGate>;
}
