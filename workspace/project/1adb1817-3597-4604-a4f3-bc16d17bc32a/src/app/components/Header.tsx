import { useState, useEffect } from 'react';
import { User } from '../models/User';
import { useRouter } from 'next/router';

interface HeaderProps {
  user: User;
}

const Header: React.FC<HeaderProps> = ({ user }) => {
  const router = useRouter();
  const [showMenu, setShowMenu] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 0) {
        setShowMenu(true);
      } else {
        setShowMenu(false);
      }
    };

    window.addEventListener('scroll', handleScroll);

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header className="bg-gray-800 py-4">
      <div className="container mx-auto flex items-center justify-between">
        <a href="/" className="text-white font-bold text-2xl">
          Your Restaurant App
        </a>
        <div className="flex items-center">
          {user ? (
            <button className="text-white px-4 py-2 rounded-md hover:bg-gray-700">
              {user.name}
            </button>
          ) : (
            <button className="text-white px-4 py-2 rounded-md hover:bg-gray-700">
              Login
            </button>
          )}
        </div>
        <div className="flex items-center">
          <button
            className="text-white px-4 py-2 rounded-md hover:bg-gray-700"
            onClick={() => router.push('/menu')}
          >
            Menu
          </button>
          <button
            className="text-white px-4 py-2 rounded-md hover:bg-gray-700"
            onClick={() => router.push('/orders')}
          >
            Orders
          </button>
        </div>
      </div>
      {showMenu && (
        <div className="bg-gray-900 absolute top-0 left-0 w-full h-screen z-10">
          <nav className="flex flex-col items-center justify-center bg-gray-900 p-4">
            <ul className="flex flex-col space-y-2">
              <li>
                <a href="/" className="text-white hover:text-gray-300">
                  Home
                </a>
              </li>
              <li>
                <a href="/menu" className="text-white hover:text-gray-300">
                  Menu
                </a>
              </li>
              <li>
                <a href="/orders" className="text-white hover:text-gray-300">
                  Orders
                </a>
              </li>
            </ul>
          </nav>
        </div>
      )}
    </header>
  );
};

export default Header;