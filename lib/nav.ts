import { MessageSquare, Shield, PenTool, LucideIcon } from "lucide-react";

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  description: string;
}

export const navItems: NavItem[] = [
  {
    title: "Agent Communication",
    href: "/agent",
    icon: MessageSquare,
    description: "Multi-model debate and collaboration",
  },
  {
    title: "AI Verifier",
    href: "/verifier",
    icon: Shield,
    description: "Search and verification pipeline",
  },
  {
    title: "AI Writer",
    href: "/writer",
    icon: PenTool,
    description: "Style-conditioned writing assistant",
  },
];
