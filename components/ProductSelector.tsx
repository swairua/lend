import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface ProductSelectorProps {
  categories: any[];
  selectedCategory: string;
  onCategoryChange: (catId: string) => void;
  products: any[];
  selectedProductId?: number;
  onProductChange: (productId: string) => void;
}

export function ProductSelector({
  categories,
  selectedCategory,
  onCategoryChange,
  products,
  selectedProductId,
  onProductChange,
}: ProductSelectorProps) {
  return (
    <div className="space-y-5">
      {/* Category */}
      <div className="space-y-1.5">
        <Label>Category</Label>
        <Select value={selectedCategory} onValueChange={onCategoryChange}>
          <SelectTrigger>
            <SelectValue placeholder="Select category" />
          </SelectTrigger>
          <SelectContent>
            {categories.map((c: any) => (
              <SelectItem key={c.id} value={String(c.id)}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Product */}
      {products.length > 0 ? (
        <div className="space-y-1.5">
          <Label>Product</Label>
          <Select value={selectedProductId ? String(selectedProductId) : ''} onValueChange={onProductChange}>
            <SelectTrigger>
              <SelectValue placeholder="Select product" />
            </SelectTrigger>
            <SelectContent>
              {products.map((p: any) => (
                <SelectItem key={p.id} value={String(p.id)}>
                  {p.name} — {p.interest_rate}% p.a.
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedProductId && products.find((p) => p.id === selectedProductId)?.description && (
            <p className="text-xs text-muted-foreground">
              {products.find((p) => p.id === selectedProductId)?.description}
            </p>
          )}
        </div>
      ) : selectedCategory ? (
        <div className="text-center py-4 text-sm text-muted-foreground">No products available in this category.</div>
      ) : null}
    </div>
  );
}
