# ROI Calculator Logic

## Step 1: Primary (Form Input)

### Customer Inputs
- **Merchant Annual GMV**: Customer-provided annual gross merchandise volume
- **Average Order Value (AOV)**: Customer-provided average order value
- **LMN Attach Rate (%)**: Customer-provided percentage (e.g., 50%)
- **Email**: Customer email address

### Calculated in Step 1
**Transaction Volume**
- **Formula:** `Merchant Annual GMV / Average Order Value (AOV)`
- **Example:** `$100,000,000 / $120 = 833,333.33`
- **Note:** Shows up to 2 decimal places with comma formatting

## Step 2: Results (After Form Submission)

### Hardcoded Parameters
- **Volume Uplift (%)**: `10%` (hardcoded)
- **Transaction Fee (%)**: `4.50%` (hardcoded)
- **Transaction Fee ($)**: `$0.30` (hardcoded)
- **LMN Fee ($)**: `$10` (hardcoded)

### Calculated in Step 2

**1. Incremental GMV**
- **Formula:** `Merchant Annual GMV * Volume Uplift (%)`
- **Where:** Volume Uplift = 10% (hardcoded)
- **Example:** `$100,000,000 * 10% = $10,000,000`

**2. Total Flex Fee**
- **Formula:** 
```
Total Flex Fee = (Transaction Fee (%) * Merchant Annual GMV * (1 + Volume Uplift (%)) * Volume Uplift (%))
               + (Transaction Fee ($) * Transaction Volume * Volume Uplift (%))
               + (LMN Fee ($) * Transaction Volume * Volume Uplift (%) * LMN Attach Rate (%))
```

- **Expressed in terms of variables:**
```
Total Flex Fee = (0.045 * Merchant Annual GMV * 1.10 * 0.10)
               + (0.30 * Transaction Volume * 0.10)
               + (10 * Transaction Volume * 0.10 * LMN Attach Rate (%))
```

- **Where:**
  - Transaction Volume = Merchant Annual GMV / Average Order Value (AOV)
  - LMN Attach Rate (%) = from customer input (Step 1)

- **Example:** 
```
Given:
- Merchant Annual GMV = $100,000,000
- Average Order Value (AOV) = $120
- LMN Attach Rate (%) = 50%

Transaction Volume = $100,000,000 / $120 = 833,333

Total Flex Fee = (0.045 * $100,000,000 * 1.10 * 0.10)
               + (0.30 * 833,333 * 0.10)
               + (10 * 833,333 * 0.10 * 0.50)
               = $495,000 + $24,999.99 + $416,666.5
               = $936,666.49
               ≈ $936,667
```

**3. Merchant ROI (Flex)**
- **Formula:** `Incremental GMV / Total Flex Fee`
- **Example:** `$10,000,000 / $936,667 = 10.68x`

## Implementation Strategy

### Step 1: Primary Variant (Form Input)
- **Input Fields:**
  - Merchant Annual GMV (number input)
  - Average Order Value (AOV) (number input)
  - LMN Attach Rate (%) (number input)
  - Email (text input)
- **Calculated Field (Real-time):**
  - Transaction Volume = Merchant Annual GMV / Average Order Value (AOV)
- **Validation:**
  - All fields must be filled
  - Email must be valid format
  - Button disabled until validation passes

### Step 2: Results Variant (After Submit)
- **Display Inputs (from Step 1):**
  - Merchant Annual GMV (read-only)
  - Average Order Value (AOV) (read-only)
  - LMN Attach Rate (%) (read-only)
- **Hardcoded Values:**
  - Volume Uplift (%) = 0.10
  - Transaction Fee (%) = 0.045
  - Transaction Fee ($) = 0.30
  - LMN Fee ($) = 10
- **Calculated Fields:**
  1. Transaction Volume = Merchant Annual GMV / Average Order Value (AOV)
  2. Incremental GMV = Merchant Annual GMV * 0.10
  3. Total Flex Fee = (0.045 * Merchant Annual GMV * 1.10 * 0.10) + (0.30 * Transaction Volume * 0.10) + (10 * Transaction Volume * 0.10 * LMN Attach Rate)
  4. Merchant ROI (Flex) = Incremental GMV / Total Flex Fee

### Calculation Order (Step 2)
1. **Transaction Volume** = Merchant Annual GMV / Average Order Value (AOV)
2. **Incremental GMV** = Merchant Annual GMV * 0.10
3. **Total Flex Fee** = (0.045 * Merchant Annual GMV * 1.10 * 0.10) + (0.30 * Transaction Volume * 0.10) + (10 * Transaction Volume * 0.10 * LMN Attach Rate)
4. **Merchant ROI (Flex)** = Incremental GMV / Total Flex Fee

### Data Types & Formatting
- Handle percentages correctly (divide by 100 in calculations, e.g., 10% = 0.10)
- Format currency values with $ and commas, no decimals (e.g., `$100,000,000`)
- Format percentages with % symbol (e.g., `10%`)
- Format ROI with "x" suffix and 2 decimals (e.g., `10.68x`)
- Format numbers with commas and up to 2 decimal places (e.g., `833,333.33`)

### State Management
- Store Step 1 inputs in React state
- Calculate Step 1 Transaction Volume in real-time
- On submit, calculate all Step 2 values
- Store form data in global store for variant switching

