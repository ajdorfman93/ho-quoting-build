//  markupOverrides.js
//  Trigger details
//  When record updated. This trigger will fire when a record is updated in a table. This does not include the creation of the record.
//  
//  Table:
//  Markup Overrides
//  Fields:
//  Updates to the % Markup % fields will fire the trigger. When watching all fields, fields created in the future will also be watched.

console.log(`Hello, ${base.name}!`);
// Step 1: Get inputs from automation
let inputConfig = input.config();
let updatedRecordId = inputConfig.updatedRecordId;

let markupTable = base.getTable("Markup Overrides");
let lineItemTable = base.getTable("Quote Line Items");

let updatedRecord = await markupTable.selectRecordAsync(updatedRecordId);
if (!updatedRecord) {
    throw new Error("❌ Could not find the updated record.");
}

let mKey = updatedRecord.getCellValue("M Composite Key");
if (!mKey) {
    throw new Error("❌ 'M Composite Key' is empty in the updated record.");
}

// Step 2: Fetch matching line items
let lineItems = await lineItemTable.selectRecordsAsync();
let matchingItems = lineItems.records.filter(record => record.getCellValue("C Composite Key") === mKey);

// Step 3: Update each matching line item
for (let record of matchingItems) {
    await lineItemTable.updateRecordAsync(record.id, {
        "Markup": [{ id: updatedRecordId }] // Link to the markup override record
    });
}

// Logging only (not for production automation)
console.log(`✅ Updated ${matchingItems.length} matching line item(s).`);

