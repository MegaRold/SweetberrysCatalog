const SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRhhqE4aOJGiFbbQ1BDiakr7O7dsUBpoGbCA5KTlCk7f-qwZ73EZztwYRzq96KAICV-zA8S2B8TJ8NL/pub?output=csv";

function parseCsv(text) {
    const rows = [];
    let row = [];
    let field = "";
    let quoted = false;

    for (let i = 0; i < text.length; i += 1) {
        const character = text[i];

        if (quoted) {
            if (character === '"' && text[i + 1] === '"') {
                field += '"';
                i += 1;
            } else if (character === '"') {
                quoted = false;
            } else {
                field += character;
            }
        } else if (character === '"') {
            quoted = true;
        } else if (character === ",") {
            row.push(field);
            field = "";
        } else if (character === "\n" || character === "\r") {
            if (character === "\r" && text[i + 1] === "\n") {
                i += 1;
            }
            row.push(field);
            rows.push(row);
            row = [];
            field = "";
        } else {
            field += character;
        }
    }

    if (quoted) {
        throw new Error("The sheet CSV contains an unfinished quoted cell.");
    }

    if (field.length > 0 || row.length > 0) {
        row.push(field);
        rows.push(row);
    }

    return rows.filter((cells) => cells.some((cell) => cell.trim() !== ""));
}

function getImageSource(value) {
    const source = value.trim();
    if (/^(https?:\/\/|\/|\.\/|Images\/)/i.test(source)) {
        return source;
    }
    return "";
}

function createProductCard(product) {
    const card = document.createElement("article");
    card.className = "Product-Card";

    const imageSource = getImageSource(product.image);
    if (imageSource) {
        const image = document.createElement("img");
        image.src = imageSource;
        image.alt = product.name;
        image.loading = "lazy";
        card.appendChild(image);
    }

    const name = document.createElement("h2");
    name.textContent = product.name;
    card.appendChild(name);

    if (product.description) {
        const description = document.createElement("p");
        description.textContent = product.description;
        card.appendChild(description);
    }

    const price = document.createElement("p");
    price.className = "Product-Price";
    price.textContent = product.price;
    card.appendChild(price);

    const quantity = document.createElement("p");
    quantity.className = "Product-Quantity";
    quantity.textContent = `Stock: ${product.quantity}`;
    card.appendChild(quantity);

    return card;
}

async function loadCatalog() {
    const productList = document.getElementById("product-list");
    const status = document.getElementById("catalog-status");
    const category = productList.dataset.category.trim().toLowerCase();

    try {
        const response = await fetch(SHEET_CSV_URL, { cache: "no-store" });
        if (!response.ok) {
            throw new Error(`The sheet returned HTTP ${response.status}.`);
        }

        const rows = parseCsv((await response.text()).replace(/^\uFEFF/, ""));
        if (rows.length === 0) {
            throw new Error("The CSV export is empty. Add the header row category, name, description, price, image and product rows.");
        }

        const headers = rows[0].map((header) => header.trim().toLowerCase());
        const column = (name) => headers.indexOf(name);
        const categoryColumn = column("category");
        const nameColumn = column("name");
        const descriptionColumn = column("description");
        const priceColumn = column("price");
        const imageColumn = column("image");
        const quantityColumn = column("quantity");

        if (categoryColumn === -1 || nameColumn === -1 || priceColumn === -1) {
            throw new Error("The first row must include category, name, and price columns.");
        }

        const products = [];
        let incompleteRows = 0;

        for (const cells of rows.slice(1)) {
            const productCategory = (cells[categoryColumn] || "").trim().toLowerCase();
            if (productCategory !== category) {
                continue;
            }

            const quantityValue = quantityColumn === -1 ? "" : (cells[quantityColumn] || "").trim();
            const quantity = quantityColumn === -1
                ? "Not listed"
                : quantityValue === ""
                    ? "Not set"
                    : /^\d+$/.test(quantityValue)
                        ? quantityValue
                        : "Invalid";
            const product = {
                name: (cells[nameColumn] || "").trim(),
                description: descriptionColumn === -1 ? "" : (cells[descriptionColumn] || "").trim(),
                price: (cells[priceColumn] || "").trim(),
                image: imageColumn === -1 ? "" : (cells[imageColumn] || "").trim(),
                quantity
            };

            if (!product.name || !product.price) {
                incompleteRows += 1;
                continue;
            }
            products.push(product);
        }

        const fragment = document.createDocumentFragment();
        products.forEach((product) => fragment.appendChild(createProductCard(product)));
        productList.replaceChildren(fragment);

        if (products.length === 0) {
            status.textContent = `No products found for ${productList.dataset.category}. Add rows with that category in the sheet.`;
        } else {
            status.textContent = `Loaded ${products.length} product${products.length === 1 ? "" : "s"}.`;
            if (incompleteRows > 0) {
                status.textContent += ` Skipped ${incompleteRows} incomplete row${incompleteRows === 1 ? "" : "s"}.`;
            }
        }
        if (quantityColumn === -1) {
            status.textContent += " Add a quantity column to the sheet to show stock counts.";
        }
    } catch (error) {
        console.error("Unable to load the product sheet:", error);
        const detail = error instanceof Error ? error.message : "An unknown error occurred.";
        status.textContent = `Products could not be loaded. ${detail} Confirm that the sheet is published as CSV.`;
    }
}

document.querySelector(".back").addEventListener("click", () => {
    window.location.href = "index.html";
});

loadCatalog();
