/**
 * Comprehensive Disease & Pest Knowledge Base for the Treatment Outcome Predictor.
 *
 * Covers fungal, bacterial, viral diseases, insect pests, nematodes, and weed problems
 * commonly found in Indian agriculture.
 */

export interface DiseaseEntry {
    id: string;
    name: string;
    /** hindi / regional name if known */
    regionalName?: string;
    type: 'fungal' | 'bacterial' | 'viral' | 'insect' | 'mite' | 'nematode' | 'nutrient' | 'weed' | 'other';
    affectedCrops: string[];
    /** Brief one-liner */
    description: string;
}

export const diseaseDictionary: DiseaseEntry[] = [
    // ── Fungal Diseases ──────────────────────────────────────────────────────────
    { id: 'late-blight', name: 'Late Blight', type: 'fungal', affectedCrops: ['Potato', 'Tomato'], description: 'Phytophthora infestans — causes dark water-soaked lesions on leaves and fruits.' },
    { id: 'early-blight', name: 'Early Blight', type: 'fungal', affectedCrops: ['Tomato', 'Potato', 'Chili'], description: 'Alternaria solani — concentric ring-shaped leaf spots.' },
    { id: 'downy-mildew', name: 'Downy Mildew', type: 'fungal', affectedCrops: ['Grape', 'Cucumber', 'Onion', 'Pearl Millet', 'Mustard'], description: 'Yellow patches on upper leaf surface with downy growth underneath.' },
    { id: 'powdery-mildew', name: 'Powdery Mildew', type: 'fungal', affectedCrops: ['Wheat', 'Grape', 'Mango', 'Chili', 'Pea', 'Cucumber', 'Okra'], description: 'White powdery fungal growth on leaves, stems and pods.' },
    { id: 'anthracnose', name: 'Anthracnose', type: 'fungal', affectedCrops: ['Mango', 'Chili', 'Banana', 'Grape', 'Papaya', 'Guava', 'Bean'], description: 'Sunken dark lesions on fruits, leaves and stems.' },
    { id: 'blast', name: 'Blast', type: 'fungal', affectedCrops: ['Rice', 'Pearl Millet', 'Finger Millet'], description: 'Magnaporthe oryzae — diamond-shaped lesions on leaves.' },
    { id: 'neck-blast', name: 'Neck Blast', type: 'fungal', affectedCrops: ['Rice'], description: 'Blast infection at the panicle neck causing grain loss.' },
    { id: 'leaf-blast', name: 'Leaf Blast', type: 'fungal', affectedCrops: ['Rice'], description: 'Blast affecting leaves with eye-shaped spots.' },
    { id: 'sheath-blight', name: 'Sheath Blight', type: 'fungal', affectedCrops: ['Rice', 'Wheat'], description: 'Rhizoctonia solani — oval lesions on leaf sheaths.' },
    { id: 'rust', name: 'Rust', type: 'fungal', affectedCrops: ['Wheat', 'Soybean', 'Groundnut', 'Linseed', 'Coffee'], description: 'Orange-brown pustules on leaves caused by rust fungi.' },
    { id: 'yellow-rust', name: 'Yellow Rust (Stripe Rust)', type: 'fungal', affectedCrops: ['Wheat', 'Barley'], description: 'Yellow-orange stripes along leaf veins.' },
    { id: 'brown-rust', name: 'Brown Rust (Leaf Rust)', type: 'fungal', affectedCrops: ['Wheat'], description: 'Brown circular pustules scattered on leaves.' },
    { id: 'black-rust', name: 'Black Rust (Stem Rust)', type: 'fungal', affectedCrops: ['Wheat', 'Barley'], description: 'Dark brown to black pustules on stems and leaves.' },
    { id: 'wilt', name: 'Wilt', type: 'fungal', affectedCrops: ['Tomato', 'Chili', 'Brinjal', 'Cotton', 'Banana', 'Chickpea', 'Pigeon Pea', 'Lentil'], description: 'Fusarium or Verticillium — plant wilts despite adequate moisture.' },
    { id: 'fusarium-wilt', name: 'Fusarium Wilt', type: 'fungal', affectedCrops: ['Tomato', 'Banana', 'Cotton', 'Chickpea', 'Watermelon'], description: 'Vascular wilt caused by Fusarium oxysporum.' },
    { id: 'root-rot', name: 'Root Rot', type: 'fungal', affectedCrops: ['Chickpea', 'Soybean', 'Cotton', 'Tomato', 'Chili'], description: 'Decay of roots leading to plant wilting and death.' },
    { id: 'collar-rot', name: 'Collar Rot', type: 'fungal', affectedCrops: ['Chickpea', 'Groundnut', 'Soybean', 'Lentil'], description: 'Rotting at the soil line (collar) of the plant.' },
    { id: 'damping-off', name: 'Damping Off', type: 'fungal', affectedCrops: ['Tomato', 'Chili', 'Brinjal', 'Cabbage', 'Cauliflower', 'Onion'], description: 'Seedlings rot at the base and collapse — common in nurseries.' },
    { id: 'leaf-spot', name: 'Leaf Spot', type: 'fungal', affectedCrops: ['Groundnut', 'Rice', 'Wheat', 'Tomato', 'Cotton', 'Mango'], description: 'Circular spots on leaves caused by various fungi.' },
    { id: 'cercospora-leaf-spot', name: 'Cercospora Leaf Spot', type: 'fungal', affectedCrops: ['Groundnut', 'Soybean', 'Sugar Beet', 'Rice'], description: 'Brown spots with yellow halo caused by Cercospora spp.' },
    { id: 'alternaria-leaf-spot', name: 'Alternaria Leaf Spot', type: 'fungal', affectedCrops: ['Tomato', 'Cabbage', 'Cauliflower', 'Mustard'], description: 'Concentric ring-shaped spots by Alternaria spp.' },
    { id: 'bacterial-leaf-spot', name: 'Bacterial Leaf Spot', type: 'bacterial', affectedCrops: ['Tomato', 'Chili', 'Citrus', 'Cotton'], description: 'Water-soaked angular spots caused by bacteria.' },
    { id: 'scab', name: 'Scab', type: 'fungal', affectedCrops: ['Apple', 'Mango', 'Citrus', 'Potato'], description: 'Rough, corky lesions on fruits and tubers.' },
    { id: 'smut', name: 'Smut', type: 'fungal', affectedCrops: ['Wheat', 'Sugarcane', 'Maize', 'Sorghum'], description: 'Black powdery spore masses replacing grain or plant parts.' },
    { id: 'loose-smut', name: 'Loose Smut', type: 'fungal', affectedCrops: ['Wheat', 'Barley'], description: 'Earhead replaced by black powdery mass.' },
    { id: 'covered-smut', name: 'Covered Smut', type: 'fungal', affectedCrops: ['Sorghum', 'Barley'], description: 'Grains covered with smut spores inside a membrane.' },
    { id: 'grain-smut', name: 'Grain Smut', type: 'fungal', affectedCrops: ['Sorghum', 'Pearl Millet'], description: 'Individual grains replaced by large smut sori.' },
    { id: 'ergot', name: 'Ergot', type: 'fungal', affectedCrops: ['Pearl Millet', 'Sorghum', 'Rye'], description: 'Sclerotia replace grains — produces honeydew.' },
    { id: 'canker', name: 'Canker', type: 'fungal', affectedCrops: ['Citrus', 'Apple', 'Mango', 'Pomegranate'], description: 'Raised corky lesions on stems, leaves and fruits.' },
    { id: 'citrus-canker', name: 'Citrus Canker', type: 'bacterial', affectedCrops: ['Citrus', 'Lemon', 'Orange'], description: 'Raised corky spots on leaves, stems and fruits of citrus.' },
    { id: 'dieback', name: 'Dieback', type: 'fungal', affectedCrops: ['Citrus', 'Mango', 'Chili'], description: 'Progressive dying-back of shoots from the tip.' },
    { id: 'panama-wilt', name: 'Panama Wilt', type: 'fungal', affectedCrops: ['Banana'], description: 'Fusarium oxysporum f.sp. cubense — lethal banana disease.' },
    { id: 'sigatoka', name: 'Sigatoka Leaf Spot', type: 'fungal', affectedCrops: ['Banana'], description: 'Yellow streaks turning brown on banana leaves.' },
    { id: 'tikka-disease', name: 'Tikka Disease', type: 'fungal', affectedCrops: ['Groundnut'], description: 'Circular brown spots (early + late leaf spot) on groundnut.' },
    { id: 'grey-mold', name: 'Grey Mold (Botrytis)', type: 'fungal', affectedCrops: ['Grape', 'Strawberry', 'Tomato', 'Rose'], description: 'Grey fuzzy mold on fruits and flowers.' },
    { id: 'black-rot', name: 'Black Rot', type: 'fungal', affectedCrops: ['Grape', 'Cabbage', 'Cauliflower'], description: 'Black sunken lesions on fruits or V-shaped lesions on leaves.' },
    { id: 'white-rust', name: 'White Rust', type: 'fungal', affectedCrops: ['Mustard', 'Rapeseed', 'Radish'], description: 'White blister-like pustules on undersides of leaves.' },
    { id: 'club-root', name: 'Club Root', type: 'fungal', affectedCrops: ['Cabbage', 'Cauliflower', 'Broccoli'], description: 'Swollen, distorted roots — Plasmodiophora brassicae.' },
    { id: 'charcoal-rot', name: 'Charcoal Rot', type: 'fungal', affectedCrops: ['Soybean', 'Sorghum', 'Maize', 'Sunflower'], description: 'Macrophomina phaseolina — stems show charcoal-like sclerotia.' },
    { id: 'stem-rot', name: 'Stem Rot', type: 'fungal', affectedCrops: ['Rice', 'Groundnut', 'Rapeseed'], description: 'Rotting of stems at the base or nodes.' },
    { id: 'false-smut', name: 'False Smut', type: 'fungal', affectedCrops: ['Rice'], description: 'Green-black velvety spore balls on rice panicle grains.' },
    { id: 'brown-spot', name: 'Brown Spot', type: 'fungal', affectedCrops: ['Rice'], description: 'Oval brown spots on rice leaves — Helminthosporium oryzae.' },
    { id: 'foot-rot', name: 'Foot Rot', type: 'fungal', affectedCrops: ['Wheat', 'Rice', 'Citrus'], description: 'Rotting at the base of the stem/trunk.' },
    { id: 'karnal-bunt', name: 'Karnal Bunt', type: 'fungal', affectedCrops: ['Wheat'], description: 'Partial bunt — grains partially replaced by black powder with fishy smell.' },
    { id: 'red-rot', name: 'Red Rot', type: 'fungal', affectedCrops: ['Sugarcane'], description: 'Colletotrichum falcatum — internal reddening of stalks.' },
    { id: 'wilt-sugarcane', name: 'Sugarcane Wilt', type: 'fungal', affectedCrops: ['Sugarcane'], description: 'Fusarium wilt of sugarcane — yellowing and drying of leaves.' },

    // ── Bacterial Diseases ───────────────────────────────────────────────────────
    { id: 'bacterial-leaf-blight', name: 'Bacterial Leaf Blight', type: 'bacterial', affectedCrops: ['Rice', 'Cotton'], description: 'Xanthomonas oryzae — water-soaked lesions turning white.' },
    { id: 'bacterial-wilt', name: 'Bacterial Wilt', type: 'bacterial', affectedCrops: ['Tomato', 'Brinjal', 'Chili', 'Potato', 'Ginger', 'Banana'], description: 'Ralstonia solanacearum — sudden wilting without yellowing.' },
    { id: 'soft-rot', name: 'Soft Rot', type: 'bacterial', affectedCrops: ['Potato', 'Carrot', 'Onion', 'Cabbage', 'Ginger'], description: 'Mushy, foul-smelling decay of tubers and bulbs.' },
    { id: 'fire-blight', name: 'Fire Blight', type: 'bacterial', affectedCrops: ['Apple', 'Pear'], description: 'Erwinia amylovora — shoots look burnt/blackened.' },
    { id: 'blight-pomegranate', name: 'Bacterial Blight of Pomegranate', type: 'bacterial', affectedCrops: ['Pomegranate'], description: 'Oily spots on leaves and fruits, cracking of fruits.' },
    { id: 'angular-leaf-spot', name: 'Angular Leaf Spot', type: 'bacterial', affectedCrops: ['Cotton', 'Cucumber'], description: 'Angular water-soaked spots limited by leaf veins.' },
    { id: 'black-arm', name: 'Black Arm', type: 'bacterial', affectedCrops: ['Cotton'], description: 'Blackening of veins and petioles in cotton.' },

    // ── Viral Diseases ──────────────────────────────────────────────────────────
    { id: 'mosaic', name: 'Mosaic Virus', type: 'viral', affectedCrops: ['Tomato', 'Tobacco', 'Cucumber', 'Papaya', 'Chili', 'Bean'], description: 'Light and dark green mosaic pattern on leaves.' },
    { id: 'yellow-mosaic', name: 'Yellow Mosaic Virus', type: 'viral', affectedCrops: ['Soybean', 'Mung Bean', 'Black Gram', 'Cowpea'], description: 'Yellow patches on leaves — transmitted by whitefly.' },
    { id: 'leaf-curl', name: 'Leaf Curl', type: 'viral', affectedCrops: ['Tomato', 'Chili', 'Cotton', 'Papaya', 'Tobacco'], description: 'Upward/downward curling and puckering of leaves.' },
    { id: 'tungro', name: 'Tungro', type: 'viral', affectedCrops: ['Rice'], description: 'Yellow-orange discoloration of leaves — transmitted by leafhopper.' },
    { id: 'bunchy-top', name: 'Bunchy Top', type: 'viral', affectedCrops: ['Banana'], description: 'Leaves become narrow, erect and bunched at the top.' },
    { id: 'ring-spot', name: 'Ring Spot', type: 'viral', affectedCrops: ['Papaya'], description: 'Ring-shaped spots on fruit — PRSV.' },
    { id: 'tristeza', name: 'Tristeza', type: 'viral', affectedCrops: ['Citrus'], description: 'Quick decline of citrus — transmitted by aphids.' },
    { id: 'grassy-stunt', name: 'Grassy Stunt', type: 'viral', affectedCrops: ['Rice'], description: 'Severe stunting and excessive tillering of rice.' },
    { id: 'gemini-virus', name: 'Gemini Virus', type: 'viral', affectedCrops: ['Tomato', 'Chili', 'Okra', 'Cotton'], description: 'Leaf curling and yellowing — spread by whitefly.' },

    // ── Insect Pests ────────────────────────────────────────────────────────────
    { id: 'aphids', name: 'Aphids', type: 'insect', affectedCrops: ['Cotton', 'Mustard', 'Wheat', 'Chili', 'Tomato', 'Okra', 'Rice', 'Citrus'], description: 'Tiny soft-bodied sap-sucking insects — cause curling and honeydew.' },
    { id: 'whitefly', name: 'Whitefly', type: 'insect', affectedCrops: ['Cotton', 'Tomato', 'Chili', 'Okra', 'Brinjal', 'Soybean'], description: 'Tiny white flying insects on leaf undersides — transmit viruses.' },
    { id: 'jassids', name: 'Jassids (Leafhoppers)', type: 'insect', affectedCrops: ['Cotton', 'Okra', 'Brinjal', 'Rice'], description: 'Hopping insects causing yellowing and leaf curling.' },
    { id: 'thrips', name: 'Thrips', type: 'insect', affectedCrops: ['Onion', 'Chili', 'Cotton', 'Mango', 'Grape', 'Rice', 'Groundnut'], description: 'Tiny rasping insects causing silvery streaks on leaves.' },
    { id: 'brown-planthopper', name: 'Brown Planthopper (BPH)', type: 'insect', affectedCrops: ['Rice'], description: 'Sap sucker causing hopper burn in rice — circular yellowing patches.' },
    { id: 'stem-borer', name: 'Stem Borer', type: 'insect', affectedCrops: ['Rice', 'Sugarcane', 'Maize', 'Sorghum'], description: 'Larvae bore into stems causing dead hearts and white ears.' },
    { id: 'yellow-stem-borer', name: 'Yellow Stem Borer', type: 'insect', affectedCrops: ['Rice'], description: 'Scirpophaga incertulas — major rice pest causing dead hearts.' },
    { id: 'bollworm', name: 'Bollworm', type: 'insect', affectedCrops: ['Cotton', 'Tomato', 'Chickpea', 'Pigeon Pea'], description: 'Helicoverpa armigera — larvae bore into bolls and fruits.' },
    { id: 'american-bollworm', name: 'American Bollworm', type: 'insect', affectedCrops: ['Cotton', 'Tomato', 'Chickpea'], description: 'Major pest of cotton and pulses — feeds on fruiting parts.' },
    { id: 'pink-bollworm', name: 'Pink Bollworm', type: 'insect', affectedCrops: ['Cotton'], description: 'Pectinophora gossypiella — larvae feed inside bolls.' },
    { id: 'spotted-bollworm', name: 'Spotted Bollworm', type: 'insect', affectedCrops: ['Cotton', 'Okra'], description: 'Earias vittella — shoots and bolls borer.' },
    { id: 'fruit-borer', name: 'Fruit Borer', type: 'insect', affectedCrops: ['Tomato', 'Brinjal', 'Chili', 'Okra'], description: 'Larvae bore into fruits leaving circular holes.' },
    { id: 'pod-borer', name: 'Pod Borer', type: 'insect', affectedCrops: ['Chickpea', 'Pigeon Pea', 'Soybean', 'Groundnut'], description: 'Larvae feed on developing pods and seeds.' },
    { id: 'shoot-borer', name: 'Shoot Borer', type: 'insect', affectedCrops: ['Sugarcane', 'Brinjal', 'Mango'], description: 'Larvae bore into growing shoots, causing wilting.' },
    { id: 'leaf-folder', name: 'Leaf Folder', type: 'insect', affectedCrops: ['Rice'], description: 'Cnaphalocrocis medinalis — larvae fold and feed inside leaves.' },
    { id: 'gall-midge', name: 'Gall Midge', type: 'insect', affectedCrops: ['Rice', 'Mango'], description: 'Larvae cause onion-leaf or silver-shoot galls in rice.' },
    { id: 'leaf-miner', name: 'Leaf Miner', type: 'insect', affectedCrops: ['Tomato', 'Chili', 'Citrus', 'Pea', 'Bean'], description: 'Larvae tunnel inside leaves creating serpentine mines.' },
    { id: 'diamondback-moth', name: 'Diamondback Moth', type: 'insect', affectedCrops: ['Cabbage', 'Cauliflower', 'Broccoli', 'Mustard'], description: 'Plutella xylostella — small moth, larvae eat leaf tissue.' },
    { id: 'leaf-eating-caterpillar', name: 'Leaf Eating Caterpillar', type: 'insect', affectedCrops: ['Soybean', 'Groundnut', 'Cotton', 'Castor'], description: 'Spodoptera — voracious feeders that defoliate crops.' },
    { id: 'armyworm', name: 'Armyworm', type: 'insect', affectedCrops: ['Maize', 'Rice', 'Wheat', 'Sorghum', 'Millet'], description: 'Migrating caterpillars that attack in large numbers.' },
    { id: 'fall-armyworm', name: 'Fall Armyworm', type: 'insect', affectedCrops: ['Maize', 'Rice', 'Sorghum', 'Sugarcane'], description: 'Spodoptera frugiperda — devastating maize pest.' },
    { id: 'cutworms', name: 'Cutworms', type: 'insect', affectedCrops: ['Tomato', 'Cabbage', 'Tobacco', 'Wheat', 'Maize'], description: 'Nocturnal larvae cut seedlings at the base.' },
    { id: 'termites', name: 'Termites', type: 'insect', affectedCrops: ['Sugarcane', 'Wheat', 'Groundnut', 'Cotton', 'Maize'], description: 'Feed on plant roots and stems underground.' },
    { id: 'white-grubs', name: 'White Grubs', type: 'insect', affectedCrops: ['Sugarcane', 'Groundnut', 'Potato', 'Wheat'], description: 'C-shaped larvae feeding on roots underground.' },
    { id: 'root-grubs', name: 'Root Grubs', type: 'insect', affectedCrops: ['Sugarcane', 'Arecanut', 'Coconut'], description: 'Beetle larvae feeding on root systems.' },
    { id: 'mealybug', name: 'Mealybug', type: 'insect', affectedCrops: ['Cotton', 'Mango', 'Papaya', 'Grape', 'Guava', 'Citrus'], description: 'White waxy-coated insects sucking plant sap.' },
    { id: 'scale-insects', name: 'Scale Insects', type: 'insect', affectedCrops: ['Mango', 'Citrus', 'Guava', 'Coconut', 'Coffee'], description: 'Armored or soft scales on stems and leaves.' },
    { id: 'fruit-fly', name: 'Fruit Fly', type: 'insect', affectedCrops: ['Mango', 'Guava', 'Citrus', 'Cucumber', 'Melon', 'Bitter Gourd'], description: 'Bactrocera spp. — maggots feed inside fruits.' },
    { id: 'mango-hopper', name: 'Mango Hopper', type: 'insect', affectedCrops: ['Mango'], description: 'Nymphs and adults suck sap from inflorescence causing flower drop.' },
    { id: 'coconut-rhinoceros-beetle', name: 'Rhinoceros Beetle', type: 'insect', affectedCrops: ['Coconut', 'Oil Palm', 'Arecanut'], description: 'Adults bore into growing point of palm crowns.' },
    { id: 'red-palm-weevil', name: 'Red Palm Weevil', type: 'insect', affectedCrops: ['Coconut', 'Oil Palm', 'Date Palm'], description: 'Rhynchophorus ferrugineus — larvae tunnel inside trunk.' },
    { id: 'rice-weevil', name: 'Rice Weevil (Storage Pest)', type: 'insect', affectedCrops: ['Rice', 'Wheat', 'Maize'], description: 'Stored grain pest — adults bore holes in grains.' },
    { id: 'coffee-berry-borer', name: 'Coffee Berry Borer', type: 'insect', affectedCrops: ['Coffee'], description: 'Hypothenemus hampei — larvae feed inside coffee berries.' },
    { id: 'tea-mosquito-bug', name: 'Tea Mosquito Bug', type: 'insect', affectedCrops: ['Tea', 'Cashew', 'Guava', 'Neem'], description: 'Helopeltis — necrotic spots from feeding punctures.' },
    { id: 'sugarcane-woolly-aphid', name: 'Sugarcane Woolly Aphid', type: 'insect', affectedCrops: ['Sugarcane'], description: 'White woolly colonies on leaf undersides.' },
    { id: 'ear-head-bug', name: 'Ear Head Bug', type: 'insect', affectedCrops: ['Rice', 'Sorghum'], description: 'Leptocorisa — sucks milky grain content causing empty grains.' },
    { id: 'green-stink-bug', name: 'Green Stink Bug', type: 'insect', affectedCrops: ['Rice', 'Soybean', 'Tomato'], description: 'Shield-shaped bugs feeding on grains and fruits.' },
    { id: 'red-hairy-caterpillar', name: 'Red Hairy Caterpillar', type: 'insect', affectedCrops: ['Groundnut', 'Castor', 'Sunflower', 'Cotton'], description: 'Hairy caterpillars defoliating crops in groups.' },
    { id: 'tobacco-caterpillar', name: 'Tobacco Caterpillar', type: 'insect', affectedCrops: ['Tobacco', 'Cotton', 'Tomato', 'Chili', 'Groundnut'], description: 'Spodoptera litura — polyphagous leaf feeder.' },
    { id: 'brinjal-shoot-borer', name: 'Brinjal Shoot & Fruit Borer', type: 'insect', affectedCrops: ['Brinjal'], description: 'Leucinodes orbonalis — bore into shoots and fruits.' },
    { id: 'okra-shoot-borer', name: 'Okra Shoot & Fruit Borer', type: 'insect', affectedCrops: ['Okra'], description: 'Earias vittella — larvae bore into shoots and fruits.' },

    // ── Mites ───────────────────────────────────────────────────────────────────
    { id: 'red-spider-mite', name: 'Red Spider Mite', type: 'mite', affectedCrops: ['Tomato', 'Brinjal', 'Chili', 'Cotton', 'Tea', 'Apple', 'Okra'], description: 'Tiny red mites causing stippling and webbing on leaves.' },
    { id: 'yellow-mite', name: 'Yellow Mite', type: 'mite', affectedCrops: ['Chili', 'Tomato', 'Tea', 'Brinjal'], description: 'Polyphagotarsonemus latus — leaf curling and bronzing.' },
    { id: 'eriophyid-mite', name: 'Eriophyid Mite', type: 'mite', affectedCrops: ['Coconut', 'Mango', 'Litchi'], description: 'Microscopic mites causing scarring on fruits.' },
    { id: 'mites-general', name: 'Mites', type: 'mite', affectedCrops: ['Cotton', 'Citrus', 'Tea', 'Vegetables'], description: 'Tiny arachnids sucking cell contents from leaves.' },

    // ── Nematodes ────────────────────────────────────────────────────────────────
    { id: 'root-knot-nematode', name: 'Root Knot Nematode', type: 'nematode', affectedCrops: ['Tomato', 'Brinjal', 'Okra', 'Chili', 'Carrot', 'Banana'], description: 'Meloidogyne spp. — galls on roots, stunted growth.' },
    { id: 'cyst-nematode', name: 'Cyst Nematode', type: 'nematode', affectedCrops: ['Potato', 'Soybean', 'Wheat'], description: 'Heterodera/Globodera — cysts visible on roots.' },
    { id: 'burrowing-nematode', name: 'Burrowing Nematode', type: 'nematode', affectedCrops: ['Banana', 'Coconut', 'Black Pepper'], description: 'Radopholus similis — tunnels through roots.' },
    { id: 'nematodes-general', name: 'Nematodes', type: 'nematode', affectedCrops: ['Vegetables', 'Banana', 'Sugarcane', 'Rice'], description: 'Microscopic roundworms damaging plant roots.' },

    // ── Nutrient Disorders ──────────────────────────────────────────────────────
    { id: 'nitrogen-deficiency', name: 'Nitrogen Deficiency', type: 'nutrient', affectedCrops: ['Rice', 'Wheat', 'Maize', 'Vegetables'], description: 'Yellowing of older leaves, stunted growth.' },
    { id: 'phosphorus-deficiency', name: 'Phosphorus Deficiency', type: 'nutrient', affectedCrops: ['Rice', 'Wheat', 'Maize'], description: 'Purple/dark green leaves, poor root development.' },
    { id: 'potassium-deficiency', name: 'Potassium Deficiency', type: 'nutrient', affectedCrops: ['Rice', 'Banana', 'Potato', 'Tomato'], description: 'Leaf edge browning (scorching), weak stems.' },
    { id: 'iron-deficiency', name: 'Iron Deficiency (Iron Chlorosis)', type: 'nutrient', affectedCrops: ['Rice', 'Groundnut', 'Soybean', 'Citrus'], description: 'Yellowing between veins of young leaves.' },
    { id: 'zinc-deficiency', name: 'Zinc Deficiency (Khaira Disease)', type: 'nutrient', affectedCrops: ['Rice', 'Maize', 'Wheat'], description: 'Rusty brown spots on leaves — common in rice.' },
    { id: 'boron-deficiency', name: 'Boron Deficiency', type: 'nutrient', affectedCrops: ['Cauliflower', 'Sunflower', 'Groundnut', 'Apple'], description: 'Hollow stems, cracked fruits, poor flowering.' },
    { id: 'general-immunity', name: 'General Plant Immunity', type: 'other', affectedCrops: ['All Crops'], description: 'Boosting overall plant health and disease resistance.' },
    { id: 'nutrient-deficiency-general', name: 'Nutrient Deficiency', type: 'nutrient', affectedCrops: ['All Crops'], description: 'General nutrient deficiency symptoms in crops.' },
    { id: 'soil-borne', name: 'Soil-borne Diseases', type: 'other', affectedCrops: ['All Crops'], description: 'Fungi, bacteria and nematodes present in soil attacking roots.' },
    { id: 'fungal-diseases-general', name: 'Fungal Diseases', type: 'fungal', affectedCrops: ['All Crops'], description: 'General fungal infections of crops.' },

    // ── Weed Problems ───────────────────────────────────────────────────────────
    { id: 'broad-leaved-weeds', name: 'Broad-leaved Weeds', type: 'weed', affectedCrops: ['Wheat', 'Rice', 'Maize', 'Sugarcane'], description: 'Dicot weeds competing with crop for nutrients.' },
    { id: 'grassy-weeds', name: 'Grassy Weeds', type: 'weed', affectedCrops: ['Rice', 'Wheat', 'Maize', 'Soybean'], description: 'Monocot weeds like barnyard grass, wild rice.' },
    { id: 'sedges', name: 'Sedges (Cyperus)', type: 'weed', affectedCrops: ['Rice', 'Sugarcane', 'Vegetables'], description: 'Triangular-stemmed sedge weeds — Cyperus spp.' },
    { id: 'broad-spectrum-weed', name: 'Broad-spectrum Weed Control', type: 'weed', affectedCrops: ['Non-crop Areas', 'Orchards'], description: 'General weed management across all weed types.' },
    { id: 'parasitic-weeds', name: 'Parasitic Weeds (Striga/Orobanche)', type: 'weed', affectedCrops: ['Sorghum', 'Maize', 'Tobacco', 'Tomato'], description: 'Root parasites robbing nutrients from crop plants.' },

    // ── More Pests ──────────────────────────────────────────────────────────────
    { id: 'leaf-hopper', name: 'Leaf Hopper', type: 'insect', affectedCrops: ['Rice', 'Cotton', 'Mango', 'Citrus', 'Vegetables'], description: 'Jumping insects sucking sap and transmitting viruses.' },
    { id: 'plant-hopper', name: 'Plant Hopper', type: 'insect', affectedCrops: ['Rice', 'Sugarcane'], description: 'Sap suckers causing hopper burn — BPH and WBPH.' },
    { id: 'hispa', name: 'Rice Hispa', type: 'insect', affectedCrops: ['Rice'], description: 'Adults scrape leaf surface, larvae mine inside leaves.' },
    { id: 'case-worm', name: 'Rice Case Worm', type: 'insect', affectedCrops: ['Rice'], description: 'Larva cuts leaf tip, rolls into a case, and feeds.' },
    { id: 'whorl-maggot', name: 'Whorl Maggot', type: 'insect', affectedCrops: ['Rice'], description: 'Maggots feed in the whorl of young rice plants.' },
    { id: 'head-borer', name: 'Head Borer', type: 'insect', affectedCrops: ['Sorghum', 'Pearl Millet'], description: 'Larvae damage developing earheads.' },
    { id: 'spotted-stem-borer', name: 'Spotted Stem Borer', type: 'insect', affectedCrops: ['Maize', 'Sorghum'], description: 'Chilo partellus — major stem borer of coarse cereals.' },
    { id: 'corn-earworm', name: 'Corn Earworm', type: 'insect', affectedCrops: ['Maize'], description: 'Larvae feed on developing cobs.' },
    { id: 'painted-bug', name: 'Painted Bug', type: 'insect', affectedCrops: ['Mustard', 'Rapeseed', 'Cabbage'], description: 'Bagrada cruciferarum — orange-black bug on crucifers.' },
    { id: 'mustard-sawfly', name: 'Mustard Sawfly', type: 'insect', affectedCrops: ['Mustard', 'Rapeseed'], description: 'Larvae defoliate mustard plants.' },
    { id: 'gram-pod-borer', name: 'Gram Pod Borer', type: 'insect', affectedCrops: ['Chickpea', 'Pigeon Pea', 'Lentil'], description: 'Helicoverpa armigera — major pulse pest.' },
    { id: 'pulse-beetle', name: 'Pulse Beetle (Storage Pest)', type: 'insect', affectedCrops: ['Chickpea', 'Pigeon Pea', 'Green Gram', 'Black Gram'], description: 'Callosobruchus — damages stored pulses.' },
    { id: 'groundnut-leaf-miner', name: 'Groundnut Leaf Miner', type: 'insect', affectedCrops: ['Groundnut'], description: 'Larvae tunnel through groundnut leaves.' },
    { id: 'coconut-mite', name: 'Coconut Mite', type: 'mite', affectedCrops: ['Coconut'], description: 'Eriophyid mite causing scarring on coconuts.' },
    { id: 'tea-red-spider', name: 'Tea Red Spider Mite', type: 'mite', affectedCrops: ['Tea'], description: 'Oligonychus coffeae — bronzing of tea leaves.' },
];

/**
 * Search diseases by name (fuzzy-friendly).
 */
export function searchDiseases(query: string): DiseaseEntry[] {
    const q = query.toLowerCase().trim();
    if (!q) return [];
    return diseaseDictionary.filter(
        (d) => d.name.toLowerCase().includes(q) || d.type.includes(q)
    );
}

/**
 * Get all unique disease type categories.
 */
export function getDiseaseTypes(): string[] {
    return [...new Set(diseaseDictionary.map(d => d.type))];
}
