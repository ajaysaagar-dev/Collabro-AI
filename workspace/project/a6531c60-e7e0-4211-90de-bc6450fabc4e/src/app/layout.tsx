import { useState } from 'react';
import { Button } from './components/InteractiveButton';
import { globals } from './styles/globals';

const Layout: React.FC = () => {
  const [buttonState, setButtonState] = useState({
    color: 'blue',
  });

  const handleButtonClick = () => {
    setButtonState({
      color: buttonState.color === 'blue' ? 'red' : 'blue',
    });
  };

  return (
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>My Next.js App</title>
        <link rel="stylesheet" href={globals.css} />
      </head>
      <body>
        <div className="container mx-auto px-4 py-8">
          <Button onClick={handleButtonClick} state={buttonState} />
        </div>
      </body>
    </html>
  );
};

export default Layout;