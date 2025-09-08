import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { Formatter } from "@export/formatter";
import * as convenienceFunctions from "@util/convenience-functions";

import { TextRun } from "../paragraph";
import { DropdownContentControl } from "./dropdown-content-control";

describe("DropdownContentControl", () => {
    beforeEach(() => {
        // Mock the numeric ID creator to return a predictable function
        vi.spyOn(convenienceFunctions, "uniqueNumericIdCreator").mockReturnValue(() => 555666777);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe("#constructor()", () => {
        it("should create valid JSON for dropDownList", () => {
            const control = new DropdownContentControl({
                tag: "TestDropdown",
                type: "dropDownList",
                listItems: [
                    { displayText: "Option 1", value: "opt1" },
                    { displayText: "Option 2", value: "opt2" },
                ],
                children: [new TextRun("Option 1")],
            });
            const stringifiedJson = JSON.stringify(control);

            // Should not throw
            expect(() => JSON.parse(stringifiedJson)).not.toThrow();
        });

        it("should create valid JSON for comboBox", () => {
            const control = new DropdownContentControl({
                tag: "TestCombo",
                type: "comboBox",
                listItems: [
                    { displayText: "Suggestion 1", value: "sug1" },
                    { displayText: "Suggestion 2", value: "sug2" },
                ],
                children: [new TextRun("Enter or select")],
            });
            const stringifiedJson = JSON.stringify(control);

            // Should not throw
            expect(() => JSON.parse(stringifiedJson)).not.toThrow();
        });

        it("should throw error for empty tag", () => {
            expect(
                () =>
                    new DropdownContentControl({
                        tag: "", // Empty tag should throw validation error
                        type: "dropDownList",
                        listItems: [{ displayText: "Test", value: "test" }],
                        children: [new TextRun("Test")],
                    }),
            ).toThrow("DropdownContentControl: 'tag' is required and cannot be empty");
        });

        it("should throw error for missing type", () => {
            // @ts-expect-error Testing missing required property
            expect(
                () =>
                    new DropdownContentControl({
                        tag: "ValidTag",
                        listItems: [{ displayText: "Test", value: "test" }],
                        children: [new TextRun("Test")],
                    }),
            ).toThrow("DropdownContentControl: 'type' is required");
        });

        it("should throw error for empty listItems", () => {
            expect(
                () =>
                    new DropdownContentControl({
                        tag: "ValidTag",
                        type: "dropDownList",
                        listItems: [], // Empty array should throw validation error
                        children: [new TextRun("Test")],
                    }),
            ).toThrow("DropdownContentControl: 'listItems' array is required and must contain at least one option");
        });

        it("should throw error for invalid listItems structure", () => {
            expect(
                () =>
                    new DropdownContentControl({
                        tag: "ValidTag",
                        type: "dropDownList",
                        listItems: [
                            { displayText: "Valid", value: "valid" },
                            { displayText: "", value: "invalid" }, // Empty displayText
                        ],
                        children: [new TextRun("Test")],
                    }),
            ).toThrow("DropdownContentControl: All listItems must have non-empty 'displayText' and 'value' string properties");
        });

        it("should warn about duplicate values", () => {
            const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

            new DropdownContentControl({
                tag: "DuplicateTest",
                type: "dropDownList",
                listItems: [
                    { displayText: "Option 1", value: "duplicate" },
                    { displayText: "Option 2", value: "duplicate" }, // Duplicate value
                ],
                children: [new TextRun("Option 1")],
            });

            expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("Found duplicate values in listItems: duplicate"));

            consoleSpy.mockRestore();
        });
    });

    describe("#prepForXml()", () => {
        it("should generate correct OOXML structure for dropDownList", () => {
            const control = new DropdownContentControl({
                tag: "TestDropdownList",
                title: "Test Dropdown",
                type: "dropDownList",
                listItems: [
                    { displayText: "High", value: "high" },
                    { displayText: "Low", value: "low" },
                ],
                children: [new TextRun("High")],
            });

            const tree = new Formatter().format(control);

            expect(tree).to.have.property("w:sdt");
            expect(tree["w:sdt"]).to.be.an("array");
            expect(tree["w:sdt"]).to.have.lengthOf(2);

            const sdtPr = tree["w:sdt"][0]["w:sdtPr"];

            // Should have dropDownList element
            const dropDownElement = sdtPr.find((el: any) => el["w:dropDownList"]);
            expect(dropDownElement).to.exist;
            expect(dropDownElement["w:dropDownList"]).to.have.lengthOf(2);

            // Should NOT have comboBox element
            const comboBoxElement = sdtPr.find((el: any) => el["w:comboBox"]);
            expect(comboBoxElement).to.not.exist;
        });

        it("should generate correct OOXML structure for comboBox", () => {
            const control = new DropdownContentControl({
                tag: "TestComboBox",
                type: "comboBox",
                listItems: [{ displayText: "Suggestion 1", value: "sug1" }],
                children: [new TextRun("Enter text")],
            });

            const tree = new Formatter().format(control);
            const sdtPr = tree["w:sdt"][0]["w:sdtPr"];

            // Should have comboBox element
            const comboBoxElement = sdtPr.find((el: any) => el["w:comboBox"]);
            expect(comboBoxElement).to.exist;
            expect(comboBoxElement["w:comboBox"]).to.have.lengthOf(1);

            // Should NOT have dropDownList element
            const dropDownElement = sdtPr.find((el: any) => el["w:dropDownList"]);
            expect(dropDownElement).to.not.exist;
        });

        it("should generate correct listItem elements", () => {
            const control = new DropdownContentControl({
                tag: "ListItemsTest",
                type: "dropDownList",
                listItems: [
                    { displayText: "First Option", value: "first" },
                    { displayText: "Second Option", value: "second" },
                    { displayText: "Third Option", value: "third" },
                ],
                children: [new TextRun("First Option")],
            });

            const tree = new Formatter().format(control);
            const sdtPr = tree["w:sdt"][0]["w:sdtPr"];
            const dropDownElement = sdtPr.find((el: any) => el["w:dropDownList"]);
            const listItems = dropDownElement["w:dropDownList"];

            expect(listItems).to.have.lengthOf(3);

            // Check first item
            expect(listItems[0]["w:listItem"]._attr["w:displayText"]).to.equal("First Option");
            expect(listItems[0]["w:listItem"]._attr["w:value"]).to.equal("first");

            // Check second item
            expect(listItems[1]["w:listItem"]._attr["w:displayText"]).to.equal("Second Option");
            expect(listItems[1]["w:listItem"]._attr["w:value"]).to.equal("second");
        });

        it("should include standard content control properties", () => {
            const control = new DropdownContentControl({
                tag: "StandardPropsTest",
                title: "Standard Properties Test",
                type: "dropDownList",
                listItems: [{ displayText: "Test", value: "test" }],
                children: [new TextRun("Test")],
            });

            const tree = new Formatter().format(control);
            const sdtPr = tree["w:sdt"][0]["w:sdtPr"];

            // Should have standard properties
            const tagElement = sdtPr.find((el: any) => el["w:tag"]);
            expect(tagElement).to.exist;
            expect(tagElement["w:tag"]._attr["w:val"]).to.equal("StandardPropsTest");

            const aliasElement = sdtPr.find((el: any) => el["w:alias"]);
            expect(aliasElement).to.exist;
            expect(aliasElement["w:alias"]._attr["w:val"]).to.equal("Standard Properties Test");

            const idElement = sdtPr.find((el: any) => el["w:id"]);
            expect(idElement).to.exist;

            // ID should be numeric
            const id = parseInt(idElement["w:id"]._attr["w:val"], 10);
            expect(id).to.be.a("number");
            expect(id).to.be.greaterThan(0);
        });

        it("should handle enhanced properties", () => {
            const control = new DropdownContentControl({
                tag: "EnhancedDropdown",
                title: "Enhanced Dropdown",
                type: "comboBox",
                appearance: "tags",
                color: "FF6600",
                lock: { sdtLocked: true },
                placeholder: "Select or enter value",
                listItems: [
                    { displayText: "Option A", value: "a" },
                    { displayText: "Option B", value: "b" },
                ],
                children: [new TextRun("Select option")],
            });

            const tree = new Formatter().format(control);
            const sdtPr = tree["w:sdt"][0]["w:sdtPr"];

            // Should have enhanced properties
            expect(sdtPr.find((el: any) => el["w:appearance"])).to.exist;
            expect(sdtPr.find((el: any) => el["w:color"])).to.exist;
            expect(sdtPr.find((el: any) => el["w:lock"])).to.exist;
            expect(sdtPr.find((el: any) => el["w:showingPlcHdr"])).to.exist;
            expect(sdtPr.find((el: any) => el["w:comboBox"])).to.exist;
        });

        it("should handle text properties for comboBox", () => {
            const control = new DropdownContentControl({
                tag: "ComboTextProps",
                type: "comboBox",
                multiLine: true,
                maxLength: 50,
                defaultStyle: {
                    bold: true,
                    color: "0066CC",
                },
                listItems: [{ displayText: "Test", value: "test" }],
                children: [new TextRun("Test")],
            });

            const tree = new Formatter().format(control);
            const sdtPr = tree["w:sdt"][0]["w:sdtPr"];

            // Should have text properties for comboBox
            const textElement = sdtPr.find((el: any) => el["w:text"]);
            expect(textElement).to.exist;
            expect(textElement["w:text"]["w:multiLine"]).to.exist;
            expect(textElement["w:text"]["w:maxLength"]._attr["w:val"]).to.equal("50");

            // Should have default styling
            const rPrElement = sdtPr.find((el: any) => el["w:rPr"]);
            expect(rPrElement).to.exist;
            expect(rPrElement["w:rPr"].find((el: any) => el["w:b"])).to.exist;
        });

        it("should not include text properties for dropDownList", () => {
            const control = new DropdownContentControl({
                tag: "DropdownNoTextProps",
                type: "dropDownList",
                multiLine: true, // This should be ignored for dropDownList
                maxLength: 50, // This should be ignored for dropDownList
                listItems: [{ displayText: "Test", value: "test" }],
                children: [new TextRun("Test")],
            });

            const tree = new Formatter().format(control);
            const sdtPr = tree["w:sdt"][0]["w:sdtPr"];

            // Should NOT have text properties for dropDownList (text props are for comboBox only)
            const textElement = sdtPr.find((el: any) => el["w:text"]);
            expect(textElement).to.not.exist;
        });

        it("should generate unique IDs for multiple dropdown controls", () => {
            const control1 = new DropdownContentControl({
                tag: "Dropdown1",
                type: "dropDownList",
                listItems: [{ displayText: "Test 1", value: "test1" }],
                children: [new TextRun("Test 1")],
            });

            const control2 = new DropdownContentControl({
                tag: "Dropdown2",
                type: "comboBox",
                listItems: [{ displayText: "Test 2", value: "test2" }],
                children: [new TextRun("Test 2")],
            });

            const tree1 = new Formatter().format(control1);
            const tree2 = new Formatter().format(control2);

            const sdtPr1 = tree1["w:sdt"][0]["w:sdtPr"];
            const sdtPr2 = tree2["w:sdt"][0]["w:sdtPr"];

            const id1 = parseInt(sdtPr1.find((el: any) => el["w:id"])["w:id"]._attr["w:val"], 10);
            const id2 = parseInt(sdtPr2.find((el: any) => el["w:id"])["w:id"]._attr["w:val"], 10);

            // IDs should be numeric and unique
            expect(id1).to.be.a("number");
            expect(id2).to.be.a("number");
            expect(id1).not.to.equal(id2);
        });
    });

    describe("Validation", () => {
        it("should validate listItems have required properties", () => {
            expect(
                () =>
                    new DropdownContentControl({
                        tag: "InvalidItems",
                        type: "dropDownList",
                        listItems: [
                            { displayText: "Valid", value: "valid" },
                            { displayText: "Invalid", value: "" }, // Empty value should trigger error
                        ],
                        children: [new TextRun("Test")],
                    }),
            ).toThrow("All listItems must have non-empty 'displayText' and 'value' string properties");
        });

        it("should validate children array is not empty", () => {
            expect(
                () =>
                    new DropdownContentControl({
                        tag: "EmptyChildren",
                        type: "dropDownList",
                        listItems: [{ displayText: "Test", value: "test" }],
                        children: [], // Empty children array
                    }),
            ).toThrow("DropdownContentControl: 'children' array is required");
        });

        it("should warn about duplicate values in listItems", () => {
            const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

            new DropdownContentControl({
                tag: "DuplicateValues",
                type: "dropDownList",
                listItems: [
                    { displayText: "Option 1", value: "duplicate" },
                    { displayText: "Option 2", value: "unique" },
                    { displayText: "Option 3", value: "duplicate" }, // Duplicate value
                ],
                children: [new TextRun("Option 1")],
            });

            expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("Found duplicate values in listItems: duplicate"));

            consoleSpy.mockRestore();
        });
    });

    describe("OOXML Generation", () => {
        it("should generate correct dropDownList OOXML structure", () => {
            const control = new DropdownContentControl({
                tag: "PriorityDropdown",
                title: "Task Priority",
                type: "dropDownList",
                listItems: [
                    { displayText: "High Priority", value: "high" },
                    { displayText: "Medium Priority", value: "medium" },
                    { displayText: "Low Priority", value: "low" },
                ],
                children: [new TextRun("Medium Priority")],
            });

            const tree = new Formatter().format(control);
            const sdtPr = tree["w:sdt"][0]["w:sdtPr"];

            // Should have dropDownList with correct structure
            const dropDownElement = sdtPr.find((el: any) => el["w:dropDownList"]);
            expect(dropDownElement).to.exist;

            const listItems = dropDownElement["w:dropDownList"];
            expect(listItems).to.have.lengthOf(3);

            // Check specific items
            expect(listItems[0]["w:listItem"]._attr["w:displayText"]).to.equal("High Priority");
            expect(listItems[0]["w:listItem"]._attr["w:value"]).to.equal("high");
            expect(listItems[1]["w:listItem"]._attr["w:displayText"]).to.equal("Medium Priority");
            expect(listItems[1]["w:listItem"]._attr["w:value"]).to.equal("medium");
        });

        it("should generate correct comboBox OOXML structure", () => {
            const control = new DropdownContentControl({
                tag: "CountryCombo",
                type: "comboBox",
                listItems: [
                    { displayText: "United States", value: "us" },
                    { displayText: "Canada", value: "ca" },
                    { displayText: "United Kingdom", value: "uk" },
                ],
                children: [new TextRun("Select or enter country")],
            });

            const tree = new Formatter().format(control);
            const sdtPr = tree["w:sdt"][0]["w:sdtPr"];

            // Should have comboBox with correct structure
            const comboBoxElement = sdtPr.find((el: any) => el["w:comboBox"]);
            expect(comboBoxElement).to.exist;

            const listItems = comboBoxElement["w:comboBox"];
            expect(listItems).to.have.lengthOf(3);

            // Check specific items
            expect(listItems[0]["w:listItem"]._attr["w:displayText"]).to.equal("United States");
            expect(listItems[0]["w:listItem"]._attr["w:value"]).to.equal("us");
        });

        it("should handle all enhanced properties", () => {
            const control = new DropdownContentControl({
                tag: "FullyEnhancedDropdown",
                title: "Enhanced Dropdown",
                type: "comboBox",
                appearance: "boundingBox",
                color: "0066CC",
                lock: {
                    contentLock: false,
                    sdtLocked: true,
                },
                placeholder: "Select or enter value",
                multiLine: false,
                maxLength: 25,
                defaultStyle: {
                    bold: true,
                    color: "FF0000",
                },
                dataBinding: {
                    xpath: "/data/selection",
                    storeItemId: "{12345678-1234-5678-9ABC-123456789005}",
                },
                listItems: [{ displayText: "Enhanced Option", value: "enhanced" }],
                children: [new TextRun("Enhanced Option")],
            });

            const tree = new Formatter().format(control);
            const sdtPr = tree["w:sdt"][0]["w:sdtPr"];

            // Verify all enhanced properties are present
            expect(sdtPr.find((el: any) => el["w:alias"])).to.exist;
            expect(sdtPr.find((el: any) => el["w:tag"])).to.exist;
            expect(sdtPr.find((el: any) => el["w:id"])).to.exist;
            expect(sdtPr.find((el: any) => el["w:appearance"])).to.exist;
            expect(sdtPr.find((el: any) => el["w:color"])).to.exist;
            expect(sdtPr.find((el: any) => el["w:lock"])).to.exist;
            expect(sdtPr.find((el: any) => el["w:showingPlcHdr"])).to.exist;
            expect(sdtPr.find((el: any) => el["w:comboBox"])).to.exist;
            expect(sdtPr.find((el: any) => el["w:text"])).to.exist;
            expect(sdtPr.find((el: any) => el["w:rPr"])).to.exist;
            expect(sdtPr.find((el: any) => el["w:dataBinding"])).to.exist;
        });
    });

    describe("Real-world Use Cases", () => {
        it("should create a priority selection dropdown", () => {
            const priorityDropdown = new DropdownContentControl({
                tag: "TaskPriority",
                title: "Task Priority Level",
                type: "dropDownList",
                appearance: "boundingBox",
                color: "FF6600",
                lock: { sdtLocked: true },
                listItems: [
                    { displayText: "🔴 Critical", value: "critical" },
                    { displayText: "🟠 High", value: "high" },
                    { displayText: "🟡 Medium", value: "medium" },
                    { displayText: "🟢 Low", value: "low" },
                ],
                children: [new TextRun("🟡 Medium")],
            });

            expect(() => new Formatter().format(priorityDropdown)).not.toThrow();
        });

        it("should create a country selection combo box", () => {
            const countryCombo = new DropdownContentControl({
                tag: "Country",
                title: "Country Selection",
                type: "comboBox",
                placeholder: "Select country or enter manually",
                maxLength: 50,
                listItems: [
                    { displayText: "United States", value: "us" },
                    { displayText: "Canada", value: "ca" },
                    { displayText: "United Kingdom", value: "uk" },
                    { displayText: "Australia", value: "au" },
                    { displayText: "Other", value: "other" },
                ],
                children: [new TextRun("Select country")],
            });

            expect(() => new Formatter().format(countryCombo)).not.toThrow();
        });
    });
});
