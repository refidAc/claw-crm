import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
      <h1 className="text-4xl font-bold text-foreground">CRM Dashboard</h1>
      <p className="text-muted-foreground text-lg">HighLevel replacement — MVP</p>
      <div className="grid grid-cols-2 gap-4 mt-4">
        {[
          { href: '/contacts', label: 'Contacts', desc: 'Manage your contacts' },
          { href: '/pipelines', label: 'Pipelines', desc: 'Track deals' },
          { href: '/conversations', label: 'Conversations', desc: 'Inbox' },
          { href: '/workflows', label: 'Workflows', desc: 'Automation' },
        ].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="p-6 rounded-lg border border-border hover:border-primary hover:shadow-md transition-all bg-card"
          >
            <h2 className="font-semibold text-lg">{item.label}</h2>
            <p className="text-muted-foreground text-sm mt-1">{item.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
