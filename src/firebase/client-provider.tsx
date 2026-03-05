'use client';

import { initializeFirebase, FirebaseProvider } from '.';
import { useState } from 'react';

export default function FirebaseClientProvider({
  children,
}: React.PropsWithChildren) {
  // Initialize Firebase only once using useState's initializer function.
  const [value] = useState(() => initializeFirebase());

  return <FirebaseProvider value={value}>{children}</FirebaseProvider>;
}
