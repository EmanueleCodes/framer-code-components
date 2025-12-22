# ROI Calculator - Override System

## Overview
This ROI Calculator uses a system of **6 code overrides** that work together to read form inputs, perform calculations, and display results in real-time.

## Architecture

### Store
A shared store (`useFormStore`) maintains all form values:
- `merchantGMV`: Merchant Annual GMV
- `averageOrderValue`: Average Order Value (AOV)
- `lmnAttachRate`: LMN Attach Rate (as decimal, e.g., 0.50 for 50%)
- `transactionVolume`: Calculated transaction volume
- `isFormValid`: Validation state

### Constants (Hardcoded)
- Volume Uplift: `10%`
- Transaction Fee (%): `4.50%`
- Transaction Fee ($): `$0.30`
- LMN Fee ($): `$10`

## The 6 Overrides

### Input Reading Overrides (Step 1)

These overrides continuously monitor input fields and update the store:

#### 1. `withGMV`
- **Apply to**: Merchant Annual GMV input field
- **Reads from**: Input with `name="MerchantGMV"`
- **Updates**: `store.merchantGMV`
- **Purpose**: Captures and validates GMV input

#### 2. `withAOV`
- **Apply to**: Average Order Value input field
- **Reads from**: Input with `name="AOV"`
- **Updates**: `store.averageOrderValue`
- **Purpose**: Captures and validates AOV input

#### 3. `withLMN`
- **Apply to**: LMN Attach Rate input field
- **Reads from**: Input with `name="LMN"`
- **Updates**: `store.lmnAttachRate`
- **Purpose**: Captures and validates LMN rate (converts percentage to decimal)

#### 4. `withTransactionVolume`
- **Apply to**: Transaction Volume TEXT element (NOT an input field!)
- **Calculates**: `merchantGMV / averageOrderValue`
- **Updates**: Text content with formatted number (e.g., `1,231.45`)
- **Display**: Shows formatted number with commas and up to 2 decimals
- **Purpose**: Shows real-time calculation of transaction volume
- **Important**: Must be applied to a text element because formatted numbers with commas cannot be set as input values

### Result Display Overrides (Step 2)

These overrides calculate and display final results:

#### 5. `withIncrementalGMV`
- **Apply to**: Incremental GMV text element
- **Calculates**: `merchantGMV * 10%`
- **Displays**: Formatted currency (e.g., `$10,000,000`)
- **Purpose**: Shows incremental GMV based on volume uplift

#### 6. `withROI`
- **Apply to**: Merchant ROI (Flex) text element
- **Calculates**: 
  ```
  Total Flex Fee = (0.045 * merchantGMV * 1.10 * 0.10)
                 + (0.30 * transactionVolume * 0.10)
                 + (10 * transactionVolume * 0.10 * lmnAttachRate)
  
  ROI = Incremental GMV / Total Flex Fee
  ```
- **Displays**: Formatted multiplier (e.g., `10.68x`)
- **Purpose**: Shows final ROI calculation

### Bonus Override

#### 7. `withFormValidation` (Optional)
- **Apply to**: Submit button or any element
- **Validates**: All required fields are filled
- **Effect**: Disables/enables element based on validation
- **Purpose**: Visual feedback for form completion

## Setup Instructions

### Step 1: Configure Inputs

Make sure your Framer elements are set up correctly:

1. **Merchant Annual GMV**: Input field with `name="MerchantGMV"`
2. **Average Order Value**: Input field with `name="AOV"`
3. **Transaction Volume**: TEXT element (not an input!) - no name needed
4. **LMN Attach Rate**: Input field with `name="LMN"`

**Important**: Transaction Volume MUST be a text element, not an input, because formatted numbers with commas (like `1,231.45`) cannot be set as input values.

### Step 2: Apply Overrides to Inputs

1. Select **Merchant Annual GMV input**
   - Open Code Overrides panel
   - Select: `Overrides.tsx → withGMV`

2. Select **Average Order Value input**
   - Open Code Overrides panel
   - Select: `Overrides.tsx → withAOV`

3. Select **LMN Attach Rate input**
   - Open Code Overrides panel
   - Select: `Overrides.tsx → withLMN`

4. Select **Transaction Volume TEXT element**
   - Open Code Overrides panel
   - Select: `Overrides.tsx → withTransactionVolume`
   - Note: This must be a text element, NOT an input field!

### Step 3: Apply Result Overrides

1. Select **Incremental GMV text element** (in Step 2/Results variant)
   - Open Code Overrides panel
   - Select: `Overrides.tsx → withIncrementalGMV`

2. Select **Merchant ROI text element** (in Step 2/Results variant)
   - Open Code Overrides panel
   - Select: `Overrides.tsx → withROI`

### Step 4: (Optional) Apply Validation Override

1. Select **Submit button** or any element you want to enable/disable
   - Open Code Overrides panel
   - Select: `Overrides.tsx → withFormValidation`

## How It Works

1. **User types** in Merchant Annual GMV input
   → `withGMV` reads value
   → Updates `store.merchantGMV`

2. **User types** in Average Order Value input
   → `withAOV` reads value
   → Updates `store.averageOrderValue`

3. **User types** in LMN Attach Rate input
   → `withLMN` reads value
   → Updates `store.lmnAttachRate`

4. **Automatically**, `withTransactionVolume`:
   → Reads `store.merchantGMV` and `store.averageOrderValue`
   → Calculates: `merchantGMV / averageOrderValue`
   → Displays formatted number

5. **In Step 2**, `withIncrementalGMV`:
   → Reads `store.merchantGMV`
   → Calculates: `merchantGMV * 10%`
   → Displays formatted currency

6. **In Step 2**, `withROI`:
   → Reads all values from store
   → Calculates Total Flex Fee using formula
   → Calculates ROI: `Incremental GMV / Total Flex Fee`
   → Displays formatted multiplier

## Data Flow

```
User Input → Input Overrides → Store → Calculation Overrides → Display
     ↓              ↓             ↓              ↓                 ↓
  [Type GMV]  [withGMV reads] [store.merchantGMV] [withIncrementalGMV] [$10,000,000]
  [Type AOV]  [withAOV reads] [store.averageOrderValue] [withTransactionVolume] [833,333]
  [Type LMN]  [withLMN reads] [store.lmnAttachRate] [withROI calculates] [10.68x]
```

## Formatting

- **Currency**: `$10,000,000` (no decimals, with commas)
- **Numbers**: `833,333.45` (up to 2 decimals, with commas)
- **ROI**: `10.68x` (2 decimal places, with "x" suffix)
- **Percentages**: Stored as decimals internally (50% = 0.50)

## Key Features

✅ **Real-time updates**: All calculations happen as you type
✅ **Automatic formatting**: Numbers and currency formatted beautifully
✅ **Type-safe**: Written in TypeScript with proper types
✅ **No button needed**: Calculations happen automatically
✅ **Shared state**: All overrides access the same store
✅ **Clean separation**: Each override has a single responsibility

## Troubleshooting

**Problem**: Values not updating
- **Solution**: Check that input `name` attributes match exactly (`MerchantGMV`, `AOV`, `LMN`). Note: Transaction Volume is a text element and doesn't need a name attribute.

**Problem**: Calculations showing 0 or wrong values
- **Solution**: Ensure all input overrides are applied before calculation overrides

**Problem**: Transaction Volume shows "out of range" error or doesn't update
- **Solution**: Make sure `withTransactionVolume` is applied to a TEXT element, NOT an input field. Formatted numbers with commas cannot be set as input values.

**Problem**: Transaction Volume shows "0" placeholder
- **Solution**: This is normal! It will update to the calculated value once you enter valid GMV and AOV values.

**Problem**: ROI shows `NaN`
- **Solution**: Ensure all input fields have valid numbers (> 0)

## Notes

- Overrides poll inputs every 100ms for changes
- All calculations follow the formulas in `logic.md`
- The system works in both Step 1 and Step 2 variants
- No need for variant switching logic - just display the right elements in each variant
