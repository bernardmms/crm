import { Link } from "react-router";
import { Building2, Contact, List, UserRoundSearch } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@repo/ui/components/ui/card";

const navCards = [
  {
    title: "Contacts",
    description: "View and manage your contacts",
    href: "/contacts",
    icon: Contact,
  },
  {
    title: "Lists",
    description: "Organize contacts into lists",
    href: "/lists",
    icon: List,
  },
  {
    title: "Leads",
    description: "Browse imported prospects and decision makers",
    href: "/leads",
    icon: UserRoundSearch,
  },
  {
    title: "Companies",
    description: "Review company intelligence and enrichment data",
    href: "/companies",
    icon: Building2,
  },
];

export default function HomePage() {
  return (
    <div className="flex flex-1 flex-col gap-6 p-4 sm:p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Welcome back
        </h1>
        <p className="mt-1 text-muted-foreground text-sm sm:text-base">
          What would you like to do today?
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {navCards.map(({ title, description, href, icon: Icon }) => (
          <Link key={href} to={href} className="group">
            <Card className="h-full transition-colors hover:border-primary/50 hover:bg-accent/40 active:bg-accent/60">
              <CardHeader className="flex flex-row items-start gap-4 space-y-0 pb-2">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary group-hover:bg-primary/20 transition-colors">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-base">{title}</CardTitle>
                  <CardDescription className="mt-1 text-sm leading-snug">
                    {description}
                  </CardDescription>
                </div>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
