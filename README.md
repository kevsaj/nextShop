# 🛍️ Next.js Shopify App

This project is a **Next.js application** that integrates with the **Shopify GraphQL API** and the **Collectr API**. It allows users to fetch products from a Shopify store, match them with Collectr options, update product prices, and manage product data efficiently.

---

## 🚀 Features

- **Fetch Products**: Retrieve products from your Shopify store and display them in a table.
- **Update Prices**: Update the price of a product and reflect the changes in real-time.
- **Match Products**: Match Shopify products with Collectr options and save the matches.
- **Check API Limits**: View the remaining credits for the Collectr API.
- **Pagination**: Navigate through products with "Next" and "Previous" buttons.
- **SKU Cleanup**: Automatically remove trailing "A" from SKUs before processing.

---

## 🛠️ Technologies Used

### Languages & Frameworks

- ![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat&logo=typescript&logoColor=white) **TypeScript**
- ![Next.js](https://img.shields.io/badge/Next.js-000000?style=flat&logo=next.js&logoColor=white) **Next.js**
- ![React](https://img.shields.io/badge/React-61DAFB?style=flat&logo=react&logoColor=black) **React**

### Libraries & Tools

- ![Shopify API](https://img.shields.io/badge/Shopify-7AB55C?style=flat&logo=shopify&logoColor=white) **Shopify GraphQL API**
- ![Collectr API](https://img.shields.io/badge/Collectr-FF5722?style=flat&logo=api&logoColor=white) **Collectr API**
- ![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=flat&logo=supabase&logoColor=white) **Supabase** (for database operations)
- ![CSS](https://img.shields.io/badge/CSS-1572B6?style=flat&logo=css3&logoColor=white) **CSS** (for styling)

---

## 📂 Project Structure

```
nextjs-shopify-app
├── pages
│   ├── index.tsx          # Main entry point of the application
│   ├── api
│   │   ├── collectrLimits.ts  # API route to fetch Collectr API limits
├── components
│   ├── ProductTable.tsx   # Component to display product information in a table
│   ├── ReadProductsTable.tsx # Component to display Shopify products
├── utils
│   ├── fetchCollectrProducts.ts # Utility to fetch Collectr products
│   ├── supabaseClient.ts  # Utility for Supabase database operations
├── public                 # Static assets
├── styles
│   ├── globals.css        # Global CSS styles
├── package.json           # npm configuration file
├── tsconfig.json          # TypeScript configuration file
├── next.config.js         # Next.js configuration file
└── README.md              # Project documentation
```

---

## ⚙️ Setup Instructions

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn
- Shopify API credentials
- Collectr API credentials

### Steps

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd nextjs-shopify-app
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up environment variables**:
   Create a `.env.local` file in the root directory and add the following:
   ```env
   SHOPIFY_API_URL=<your-shopify-api-url>
   SHOPIFY_ACCESS_TOKEN=<your-shopify-access-token>
   COLLECTR_API_BASE_URL=<your-collectr-api-base-url>
   COLLECTR_API_KEY=<your-collectr-api-key>
   ```

4. **Run the development server**:
   ```bash
   npm run dev
   ```

5. **Open the application**:
   Navigate to `http://localhost:3000` in your browser.

---

## 📝 Usage

### Main Features
1. **Fetch Products**:
   - Click the "Read Products" button to fetch products from your Shopify store.
   - Products will be displayed in a table.

2. **Update Product Prices**:
   - Use the "Update Product" button to update the price of a product.
   - The updated price will be reflected in the table.

3. **Match Products**:
   - Click the "Match Products" button to match Shopify products with Collectr options.
   - Save the matches to the database.

4. **Check API Limits**:
   - Click the "Check Limit" button to view the remaining credits for the Collectr API.

5. **Pagination**:
   - Use the "Next" and "Previous" buttons to navigate through the product list.

---


## 🐛 Known Issues

- **Caching Issue**: Ensure that API responses are not cached by adding appropriate headers.
- **SKU Cleanup**: SKUs ending with "A" are automatically cleaned before processing.

---

## 📜 License

This project is licensed under the [MIT License](LICENSE).

---

## 📧 Contact

For questions or support, please contact [kisstudios98@gmail.com](mailto:kisstudios98@gmail.com).

---

### © 2025 Kisstudios Production
