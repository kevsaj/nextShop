import React from 'react';

interface Product {
  id: string;
  title: string;
  price: string;
}

interface ProductTableProps {
  product: Product; // Change from products array to a single product
}

const ProductTable: React.FC<ProductTableProps> = ({ product }) => {
  return (
    <table>
      <thead>
        <tr>
          <th>ID</th>
          <th>Title</th>
          <th>Price</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>{product.id}</td>
          <td>{product.title}</td>
          <td>{product.price}</td>
        </tr>
      </tbody>
    </table>
  );
};

export default ProductTable;