# CSV Import Template Guide

## File Format

The CSV file should follow this exact format with the header row:

```csv
item_id,item_name,item_type,rarity,max_stacked,is_stacked,is_tradable,attributes,drops
```

## Field Descriptions

### Required Fields

- **item_id**: Unique integer ID for the item (must be positive)
- **item_name**: Display name of the item (string, cannot be empty)
- **item_type**: Type of item (see Item Types below)
- **rarity**: Rarity level (see Rarity Levels below)
- **max_stacked**: Maximum stack size (positive integer)
- **is_stacked**: Whether item can be stacked (true/false)
- **is_tradable**: Whether item can be traded (true/false)

### Optional Fields

- **attributes**: Item attributes in format "AttributeName:Value,AttributeName:Value"
- **drops**: Drop items in format "ItemId:Probability:Quantity,ItemId:Probability:Quantity"

## Item Types (use numbers)

- 0 = Weapon
- 1 = Consumable
- 2 = Material
- 3 = Seed
- 4 = Crop
- 5 = Livestock
- 6 = AnimalFeed
- 7 = Tool
- 8 = Quest
- 9 = Other

## Rarity Levels (use numbers)

- 0 = Common
- 1 = Uncommon
- 2 = Rare
- 3 = Epic
- 4 = Legendary

## Available Attributes

- Damage
- Durability
- GrowthRate
- YieldBonus
- Health
- Speed
- Resistance
- Strength
- Agility
- Stamina
- Fertility
- WaterUsage
- FeedEfficiency
- Quality

## Drops Format

Format: `ItemId:Probability:Quantity`

- ItemId: ID of the drop item
- Probability: Drop chance as percentage (0.01 to 100.00)
- Quantity: Number of items to drop

Example: `"2:25.5:2,3:15.2:1"` means:

- Item ID 2 has 25.5% chance to drop 2 items
- Item ID 3 has 15.2% chance to drop 1 item

## Example Rows

```csv
1,Iron Sword,0,0,1,false,true,"Damage:15,Durability:100","2:25.5:2,3:15.2:1"
2,Golden Apple,1,2,50,true,true,"Health:50",""
3,Wheat Seed,3,0,100,true,true,"GrowthRate:5,YieldBonus:10","4:100.0:5"
```

## Important Notes

- Do not include extra spaces around commas
- Use double quotes around attribute and drop values if they contain commas
- Empty attributes or drops should be left as empty strings ""
- All boolean values should be lowercase: true, false
- Decimal values should use dot (.) not comma (,)
