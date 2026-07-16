import { SessionProvider } from 'next-auth/react';
import { getServerSession } from 'next-auth';
import { authOptions } from './utils/auth';
import Header from './components/Header';
import Footer from './components/Footer';

export default async function Page() {
  const session = await getServerSession(authOptions);

  return (
    <SessionProvider session={session}>
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1">
          <section className="py-12 px-4">
            <div className="max-w-4xl mx-auto">
              <h1 className="text-4xl font-bold text-gray-900 mb-6">
                Welcome to FoodieApp
              </h1>
              <p className="text-lg text-gray-600 mb-8">
                Discover the best restaurants and order your favorite meals
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h2 className="text-xl font-semibold mb-4">Restaurants</h2>
                  <p className="text-gray-600 mb-4">
                    Browse through hundreds of restaurants in your area.
                  </p>
                </div>
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h2 className="text-xl font-semibold mb-4">Menu</h2>
                  <p className="text-gray-600 mb-4">
                    Explore detailed menus with delicious food options.
                  </p>
                </div>
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h2 className="text-xl font-semibold mb-4">Orders</h2>
                  <p className="text-gray-600 mb-4">
                    Track your orders and get real-time updates.
                  </p>
                </div>
              </div>
            </div>
          </section>
        </main>
        <Footer />
      </div>
    </SessionProvider>
  );
}