import { FieldGroup } from '@/components/FieldGroup';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select';

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
      <FieldGroup label="Category" id="loan_category">
        <Select value={selectedCategory} onValueChange={onCategoryChange}>
          <SelectTrigger id="loan_category">
            {categories.find(c => String(c.id) === selectedCategory)?.name || "Select category"}
          </SelectTrigger>
          <SelectContent>
            {categories.map((c: any) => (
              <SelectItem key={c.id} value={String(c.id)}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FieldGroup>

      {products.length > 0 ? (
        <FieldGroup
          label="Product"
          id="loan_product"
          helper={selectedProductId ? (products.find((p) => p.id === selectedProductId)?.description || undefined) : undefined}
        >
          <Select value={selectedProductId ? String(selectedProductId) : ''} onValueChange={onProductChange}>
            <SelectTrigger id="loan_product">
              {(() => {
                if (!selectedProductId) return "Select product";
                const p = products.find(p => p.id === selectedProductId);
                return p ? `${p.name} — ${p.interest_rate}% p.a.` : "Select product";
              })()}
            </SelectTrigger>
            <SelectContent>
              {products.map((p: any) => (
                <SelectItem key={p.id} value={String(p.id)}>
                  {p.name} — {p.interest_rate}% p.a.
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FieldGroup>
      ) : selectedCategory ? (
        <div className="text-center py-4 text-sm text-muted-foreground">No products available in this category.</div>
      ) : null}
    </div>
  );
}
