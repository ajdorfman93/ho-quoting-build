// priceOverrides.js
//
//  When record updated. This trigger will fire when a record is updated in a table. This does not include the creation of the record.
//
//  Table:
//  Price Overrides
//  Fields:
//  % Override Price % field updates will trigger this automation. When watching all fields, fields created in the future will also be watched.
//

// Step 1: Get input from automation trigger
let inputConfig = input.config();
let updatedRecordId = inputConfig.updatedRecordId;

let priceOverrideTable = base.getTable("Price Overrides");
let lineItemTable = base.getTable("Quote Line Items");

// Step 2: Get the updated Price Override record
let updatedRecord = await priceOverrideTable.selectRecordAsync(updatedRecordId);
if (!updatedRecord) {
    throw new Error("❌ Could not find the updated Price Override record.");
}

let pKey = updatedRecord.getCellValue("P Composite Key");
if (!pKey) {
    throw new Error("❌ 'P Composite Key' is empty in the updated record.");
}

// Step 3: Find matching records in Quote Line Item
let lineItems = await lineItemTable.selectRecordsAsync();
let matchingItems = lineItems.records.filter(record => record.getCellValue("P Composite Key") === pKey);

// Step 4: Update 'Price Overrides' link field for all matching records
for (let record of matchingItems) {
    await lineItemTable.updateRecordAsync(record.id, {
        "Price Overrides (Table)": [{ id: updatedRecordId }]
    });
}

// Optional log for debugging
console.log(`✅ Linked ${matchingItems.length} line item(s) to Price Override.`);
