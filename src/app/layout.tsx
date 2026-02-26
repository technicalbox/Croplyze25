import type { Metadata } from 'next';
import './globals.css';
import FirebaseClientProvider from '@/firebase/client-provider';
import { TranslationProvider } from '@/lib/i18n';
import BottomNav from '@/components/common/bottom-nav';
import { NotificationProvider } from '@/providers/notification-provider';
import PageTransitionWrapper from '@/components/common/page-transition-wrapper';

export const metadata: Metadata = {
  title: 'Croplyze',
  description: 'AI-powered crop disease detection and treatment advice for farmers.',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased bg-background overflow-x-hidden" style={{ touchAction: 'pan-y' }}>
        <FirebaseClientProvider>
            <NotificationProvider>
              <TranslationProvider>
                <div className="flex flex-col min-h-screen mobile-container">
                  <main className="flex-1 flex flex-col">
                      <PageTransitionWrapper>
                          {children}
                      </PageTransitionWrapper>
                  </main>
                  <BottomNav />
                </div>
              </TranslationProvider>
            </NotificationProvider>
        </FirebaseClientProvider>
      </body>
    </html>
  );
}
