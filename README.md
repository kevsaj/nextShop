# Next.js Shopify App

This project is a simple Next.js application that interacts with the Shopify GraphQL API. It allows users to fetch the first product from a Shopify store and update its price with a button click. The updated product information is then displayed in a table format.

## Project Structure

```
nextjs-shopify-app
├── pages
│   ├── index.tsx          # Main entry point of the application
├── components
│   └── ProductTable.tsx   # Component to display product information in a table
├── lib
│   └── shopify.ts         # Functions to interact with the Shopify GraphQL API
├── public                 # Static assets
├── styles
│   └── globals.css        # Global CSS styles
├── package.json           # npm configuration file
├── tsconfig.json          # TypeScript configuration file
├── next.config.js         # Next.js configuration file
└── README.md              # Project documentation
```

## Setup Instructions

1. Clone the repository:
   ```
   git clone <repository-url>
   cd nextjs-shopify-app
   ```

2. Install the dependencies:
   ```
   npm install
   ```

3. Create a `.env.local` file in the root directory and add your Shopify API credentials:
   ```
   SHOPIFY_API_URL=<your-shopify-api-url>
   SHOPIFY_ACCESS_TOKEN=<your-shopify-access-token>
   ```

4. Run the development server:
   ```
   npm run dev
   ```

5. Open your browser and navigate to `http://localhost:3000` to see the application in action.

## Usage

- Click the button on the main page to fetch the first product from your Shopify store.
- The application will display the product details in a table.
- You can also update the product's price by clicking the designated button, and the updated information will be shown in the table.

## License

This project is licensed under the MIT License.