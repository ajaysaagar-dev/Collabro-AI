import { Html, Head, Main, NextPage } from 'next/document';
import { Fragment } from 'react';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import { useTheme } from '../hooks/useTheme';

const Layout = ({ children }: { children: React.ReactNode }) => {
  const { theme } = useTheme();

  return (
    <Html lang="en">
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </Head>
      <body className={theme}>
        <Header />
        <Main>{children}</Main>
        <Footer />
      </body>
    </Html>
  );
};

export default Layout;