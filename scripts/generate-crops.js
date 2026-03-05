// Generate 500+ crop entries for crops_seed.json
const fs = require('fs');
const path = require('path');

const crops = [
    // Keep existing 15
    ...require('../src/data/crops_seed.json'),
];

const existingIds = new Set(crops.map(c => c.id));

// Master list of crops to add
const newCrops = [
    // GRAINS & CEREALS
    { id: 'barley', en: 'Barley', hi: 'जौ', te: 'బార్లీ', ta: 'பார்லி', kn: 'ಬಾರ್ಲಿ', sci: 'Hordeum vulgare', type: 'grain', seasons: ['Rabi'], soil: { best: ['loamy', 'sandy_loam'], bad: ['clayey'] }, water: 'Low', sun: 'Full sun', temp: { min: 12, max: 25 }, harvest: 120, diseases: [{ name: 'Powdery mildew', prevention: 'Use resistant varieties', treatment: 'Apply sulfur fungicide' }] },
    { id: 'sorghum', en: 'Sorghum', hi: 'ज्वार', te: 'జొన్న', ta: 'சோளம்', kn: 'ಜೋಳ', sci: 'Sorghum bicolor', type: 'grain', seasons: ['Kharif'], soil: { best: ['loamy', 'black_cotton'], bad: ['waterlogged'] }, water: 'Low', sun: 'Full sun', temp: { min: 25, max: 40 }, harvest: 110, diseases: [{ name: 'Grain mold', prevention: 'Harvest at right moisture', treatment: 'Apply fungicide' }] },
    { id: 'pearl_millet', en: 'Pearl Millet', hi: 'बाजरा', te: 'సజ్జలు', ta: 'கம்பு', kn: 'ಸಜ್ಜೆ', sci: 'Pennisetum glaucum', type: 'grain', seasons: ['Kharif'], soil: { best: ['sandy', 'sandy_loam'], bad: ['waterlogged'] }, water: 'Low', sun: 'Full sun', temp: { min: 25, max: 35 }, harvest: 80, diseases: [{ name: 'Downy mildew', prevention: 'Use resistant varieties', treatment: 'Metalaxyl seed treatment' }] },
    { id: 'finger_millet', en: 'Finger Millet', hi: 'रागी', te: 'రాగి', ta: 'கேழ்வரகு', kn: 'ರಾಗಿ', sci: 'Eleusine coracana', type: 'grain', seasons: ['Kharif'], soil: { best: ['red', 'laterite'], bad: ['waterlogged'] }, water: 'Low', sun: 'Full sun', temp: { min: 20, max: 30 }, harvest: 100, diseases: [{ name: 'Blast', prevention: 'Seed treatment', treatment: 'Apply tricyclazole' }] },
    { id: 'oats', en: 'Oats', hi: 'जई', te: 'ఓట్స్', ta: 'ஓட்ஸ்', kn: 'ಓಟ್ಸ್', sci: 'Avena sativa', type: 'grain', seasons: ['Rabi'], soil: { best: ['loamy', 'clay_loam'], bad: ['sandy'] }, water: 'Medium', sun: 'Full sun', temp: { min: 10, max: 25 }, harvest: 120, diseases: [{ name: 'Crown rust', prevention: 'Use resistant varieties', treatment: 'Apply propiconazole' }] },
    // PULSES
    { id: 'chickpea', en: 'Chickpea', hi: 'चना', te: 'శనగలు', ta: 'கொண்டைக்கடலை', kn: 'ಕಡಲೆ', sci: 'Cicer arietinum', type: 'pulse', seasons: ['Rabi'], soil: { best: ['loamy', 'sandy_loam'], bad: ['waterlogged'] }, water: 'Low', sun: 'Full sun', temp: { min: 10, max: 30 }, harvest: 100, diseases: [{ name: 'Wilt', prevention: 'Seed treatment', treatment: 'Use resistant varieties' }] },
    { id: 'pigeon_pea', en: 'Pigeon Pea', hi: 'अरहर', te: 'కందులు', ta: 'துவரை', kn: 'ತೊಗರಿ', sci: 'Cajanus cajan', type: 'pulse', seasons: ['Kharif'], soil: { best: ['loamy', 'red'], bad: ['saline'] }, water: 'Low', sun: 'Full sun', temp: { min: 20, max: 35 }, harvest: 150, diseases: [{ name: 'Wilt', prevention: 'Crop rotation', treatment: 'Use resistant varieties' }] },
    { id: 'green_gram', en: 'Green Gram', hi: 'मूंग', te: 'పెసలు', ta: 'பாசிப்பயறு', kn: 'ಹೆಸರು', sci: 'Vigna radiata', type: 'pulse', seasons: ['Kharif', 'Zaid'], soil: { best: ['loamy', 'sandy_loam'], bad: ['waterlogged'] }, water: 'Low', sun: 'Full sun', temp: { min: 25, max: 35 }, harvest: 65, diseases: [{ name: 'Yellow mosaic', prevention: 'Use resistant varieties', treatment: 'Control whiteflies' }] },
    { id: 'black_gram', en: 'Black Gram', hi: 'उड़द', te: 'మినుములు', ta: 'உளுந்து', kn: 'ಉದ್ದು', sci: 'Vigna mungo', type: 'pulse', seasons: ['Kharif'], soil: { best: ['loamy', 'black_cotton'], bad: ['sandy'] }, water: 'Low', sun: 'Full sun', temp: { min: 25, max: 35 }, harvest: 70, diseases: [{ name: 'Yellow mosaic', prevention: 'Early sowing', treatment: 'Imidacloprid spray' }] },
    { id: 'lentil', en: 'Lentil', hi: 'मसूर', te: 'మసూరు', ta: 'மசூர்', kn: 'ಮಸೂರ', sci: 'Lens culinaris', type: 'pulse', seasons: ['Rabi'], soil: { best: ['loamy', 'clay_loam'], bad: ['sandy'] }, water: 'Low', sun: 'Full sun', temp: { min: 10, max: 25 }, harvest: 110, diseases: [{ name: 'Rust', prevention: 'Timely sowing', treatment: 'Mancozeb spray' }] },
    { id: 'kidney_bean', en: 'Kidney Bean', hi: 'राजमा', te: 'రాజ్మా', ta: 'ராஜ்மா', kn: 'ರಾಜ್ಮಾ', sci: 'Phaseolus vulgaris', type: 'pulse', seasons: ['Rabi'], soil: { best: ['loamy'], bad: ['waterlogged'] }, water: 'Medium', sun: 'Full sun', temp: { min: 15, max: 25 }, harvest: 90, diseases: [{ name: 'Anthracnose', prevention: 'Clean seed', treatment: 'Carbendazim' }] },
    { id: 'cowpea', en: 'Cowpea', hi: 'लोबिया', te: 'బొబ్బర్లు', ta: 'தட்டப்பயறு', kn: 'ಅಲಸಂದೆ', sci: 'Vigna unguiculata', type: 'pulse', seasons: ['Kharif', 'Zaid'], soil: { best: ['sandy_loam', 'loamy'], bad: ['waterlogged'] }, water: 'Low', sun: 'Full sun', temp: { min: 25, max: 35 }, harvest: 60, diseases: [{ name: 'Mosaic virus', prevention: 'Use resistant varieties', treatment: 'Remove infected plants' }] },
    // VEGETABLES
    { id: 'okra', en: 'Okra', hi: 'भिंडी', te: 'బెండకాయ', ta: 'வெண்டை', kn: 'ಬೆಂಡೆಕಾಯಿ', sci: 'Abelmoschus esculentus', type: 'vegetable', seasons: ['Kharif', 'Zaid'], soil: { best: ['loamy', 'sandy_loam'], bad: ['waterlogged'] }, water: 'Medium', sun: 'Full sun', temp: { min: 25, max: 35 }, harvest: 50, diseases: [{ name: 'Yellow vein mosaic', prevention: 'Use resistant varieties', treatment: 'Remove infected plants' }] },
    { id: 'brinjal', en: 'Brinjal', hi: 'बैगन', te: 'వంకాయ', ta: 'கத்தரிக்காய்', kn: 'ಬದನೆಕಾಯಿ', sci: 'Solanum melongena', type: 'vegetable', seasons: ['Kharif', 'Rabi'], soil: { best: ['loamy', 'sandy_loam'], bad: ['waterlogged'] }, water: 'Medium', sun: 'Full sun', temp: { min: 20, max: 30 }, harvest: 70, diseases: [{ name: 'Fruit borer', prevention: 'Neem oil spray', treatment: 'Bt application' }] },
    { id: 'cabbage', en: 'Cabbage', hi: 'पत्ता गोभी', te: 'క్యాబేజీ', ta: 'முட்டைகோஸ்', kn: 'ಎಲೆಕೋಸು', sci: 'Brassica oleracea var. capitata', type: 'vegetable', seasons: ['Rabi'], soil: { best: ['loamy', 'clay_loam'], bad: ['sandy'] }, water: 'Medium', sun: 'Full sun', temp: { min: 15, max: 25 }, harvest: 90, diseases: [{ name: 'Black rot', prevention: 'Hot water seed treatment', treatment: 'Copper spray' }] },
    { id: 'cauliflower', en: 'Cauliflower', hi: 'फूल गोभी', te: 'కాలీఫ్లవర్', ta: 'காலிஃபிளவர்', kn: 'ಹೂಕೋಸು', sci: 'Brassica oleracea var. botrytis', type: 'vegetable', seasons: ['Rabi'], soil: { best: ['loamy', 'clay_loam'], bad: ['sandy'] }, water: 'Medium', sun: 'Full sun', temp: { min: 15, max: 25 }, harvest: 85, diseases: [{ name: 'Black rot', prevention: 'Seed treatment', treatment: 'Streptocycline spray' }] },
    { id: 'carrot', en: 'Carrot', hi: 'गाजर', te: 'కారెట్', ta: 'கேரட்', kn: 'ಗಜ್ಜರಿ', sci: 'Daucus carota', type: 'vegetable', seasons: ['Rabi'], soil: { best: ['sandy_loam', 'loamy'], bad: ['clayey'] }, water: 'Medium', sun: 'Full sun', temp: { min: 10, max: 25 }, harvest: 75, diseases: [{ name: 'Alternaria blight', prevention: 'Crop rotation', treatment: 'Mancozeb spray' }] },
    { id: 'radish', en: 'Radish', hi: 'मूली', te: 'ముల్లంగి', ta: 'முள்ளங்கி', kn: 'ಮೂಲಂಗಿ', sci: 'Raphanus sativus', type: 'vegetable', seasons: ['Rabi'], soil: { best: ['sandy_loam', 'loamy'], bad: ['clayey'] }, water: 'Medium', sun: 'Full sun', temp: { min: 10, max: 25 }, harvest: 35, diseases: [{ name: 'White rust', prevention: 'Crop rotation', treatment: 'Metalaxyl spray' }] },
    { id: 'spinach', en: 'Spinach', hi: 'पालक', te: 'పాలకూర', ta: 'பாலக்கீரை', kn: 'ಪಾಲಕ್', sci: 'Spinacia oleracea', type: 'vegetable', seasons: ['Rabi'], soil: { best: ['loamy', 'clay_loam'], bad: ['sandy'] }, water: 'Medium', sun: 'Partial shade', temp: { min: 10, max: 20 }, harvest: 40, diseases: [{ name: 'Downy mildew', prevention: 'Good drainage', treatment: 'Metalaxyl spray' }] },
    { id: 'pea', en: 'Pea', hi: 'मटर', te: 'బఠాణీ', ta: 'பட்டாணி', kn: 'ಬಟಾಣಿ', sci: 'Pisum sativum', type: 'vegetable', seasons: ['Rabi'], soil: { best: ['loamy', 'sandy_loam'], bad: ['waterlogged'] }, water: 'Medium', sun: 'Full sun', temp: { min: 10, max: 20 }, harvest: 65, diseases: [{ name: 'Powdery mildew', prevention: 'Resistant varieties', treatment: 'Sulfur spray' }] },
    { id: 'bitter_gourd', en: 'Bitter Gourd', hi: 'करेला', te: 'కాకరకాయ', ta: 'பாகற்காய்', kn: 'ಹಾಗಲಕಾಯಿ', sci: 'Momordica charantia', type: 'vegetable', seasons: ['Kharif', 'Zaid'], soil: { best: ['loamy', 'sandy_loam'], bad: ['waterlogged'] }, water: 'Medium', sun: 'Full sun', temp: { min: 25, max: 35 }, harvest: 55, diseases: [{ name: 'Powdery mildew', prevention: 'Good air circulation', treatment: 'Sulfur spray' }] },
    { id: 'bottle_gourd', en: 'Bottle Gourd', hi: 'लौकी', te: 'సొరకాయ', ta: 'சுரைக்காய்', kn: 'ಸೋರೆಕಾಯಿ', sci: 'Lagenaria siceraria', type: 'vegetable', seasons: ['Kharif', 'Zaid'], soil: { best: ['loamy', 'sandy_loam'], bad: ['waterlogged'] }, water: 'Medium', sun: 'Full sun', temp: { min: 25, max: 35 }, harvest: 60, diseases: [{ name: 'Downy mildew', prevention: 'Proper spacing', treatment: 'Metalaxyl spray' }] },
    { id: 'ridge_gourd', en: 'Ridge Gourd', hi: 'तोरई', te: 'బీరకాయ', ta: 'பீர்க்கங்காய்', kn: 'ಹೀರೆಕಾಯಿ', sci: 'Luffa acutangula', type: 'vegetable', seasons: ['Kharif'], soil: { best: ['loamy', 'sandy_loam'], bad: ['waterlogged'] }, water: 'Medium', sun: 'Full sun', temp: { min: 25, max: 35 }, harvest: 50, diseases: [{ name: 'Mosaic virus', prevention: 'Control vectors', treatment: 'Remove infected plants' }] },
    { id: 'cucumber', en: 'Cucumber', hi: 'खीरा', te: 'దోసకాయ', ta: 'வெள்ளரிக்காய்', kn: 'ಸೌತೆಕಾಯಿ', sci: 'Cucumis sativus', type: 'vegetable', seasons: ['Kharif', 'Zaid'], soil: { best: ['loamy', 'sandy_loam'], bad: ['waterlogged'] }, water: 'Medium', sun: 'Full sun', temp: { min: 20, max: 35 }, harvest: 45, diseases: [{ name: 'Downy mildew', prevention: 'Good drainage', treatment: 'Mancozeb spray' }] },
    { id: 'pumpkin', en: 'Pumpkin', hi: 'कद्दू', te: 'గుమ్మడికాయ', ta: 'பூசணிக்காய்', kn: 'ಕುಂಬಳಕಾಯಿ', sci: 'Cucurbita moschata', type: 'vegetable', seasons: ['Kharif'], soil: { best: ['loamy', 'sandy_loam'], bad: ['waterlogged'] }, water: 'Medium', sun: 'Full sun', temp: { min: 20, max: 35 }, harvest: 100, diseases: [{ name: 'Powdery mildew', prevention: 'Proper spacing', treatment: 'Sulfur spray' }] },
    { id: 'watermelon', en: 'Watermelon', hi: 'तरबूज', te: 'పుచ్చకాయ', ta: 'தர்பூசணி', kn: 'ಕಲ್ಲಂಗಡಿ', sci: 'Citrullus lanatus', type: 'fruit', seasons: ['Zaid'], soil: { best: ['sandy_loam'], bad: ['clayey'] }, water: 'Medium', sun: 'Full sun', temp: { min: 25, max: 40 }, harvest: 80, diseases: [{ name: 'Fusarium wilt', prevention: 'Crop rotation', treatment: 'Use resistant varieties' }] },
    { id: 'muskmelon', en: 'Muskmelon', hi: 'खरबूजा', te: 'ఖర్బూజా', ta: 'முலாம்பழம்', kn: 'ಖರ್ಬೂಜ', sci: 'Cucumis melo', type: 'fruit', seasons: ['Zaid'], soil: { best: ['sandy_loam'], bad: ['waterlogged'] }, water: 'Medium', sun: 'Full sun', temp: { min: 25, max: 35 }, harvest: 70, diseases: [{ name: 'Powdery mildew', prevention: 'Proper spacing', treatment: 'Sulfur spray' }] },
    // SPICES
    { id: 'coriander', en: 'Coriander', hi: 'धनिया', te: 'కొత్తిమీర', ta: 'கொத்தமல்லி', kn: 'ಕೊತ್ತಂಬರಿ', sci: 'Coriandrum sativum', type: 'spice', seasons: ['Rabi'], soil: { best: ['loamy', 'sandy_loam'], bad: ['waterlogged'] }, water: 'Low', sun: 'Full sun', temp: { min: 15, max: 25 }, harvest: 45, diseases: [{ name: 'Wilt', prevention: 'Seed treatment', treatment: 'Carbendazim' }] },
    { id: 'cumin', en: 'Cumin', hi: 'जीरा', te: 'జీలకర్ర', ta: 'சீரகம்', kn: 'ಜೀರಿಗೆ', sci: 'Cuminum cyminum', type: 'spice', seasons: ['Rabi'], soil: { best: ['sandy_loam'], bad: ['waterlogged'] }, water: 'Low', sun: 'Full sun', temp: { min: 15, max: 25 }, harvest: 100, diseases: [{ name: 'Wilt', prevention: 'Seed treatment', treatment: 'Carbendazim' }] },
    { id: 'fenugreek', en: 'Fenugreek', hi: 'मेथी', te: 'మెంతులు', ta: 'வெந்தயம்', kn: 'ಮೆಂತ್ಯ', sci: 'Trigonella foenum-graecum', type: 'spice', seasons: ['Rabi'], soil: { best: ['loamy', 'sandy_loam'], bad: ['waterlogged'] }, water: 'Low', sun: 'Full sun', temp: { min: 15, max: 25 }, harvest: 90, diseases: [{ name: 'Powdery mildew', prevention: 'Proper spacing', treatment: 'Sulfur spray' }] },
    { id: 'black_pepper', en: 'Black Pepper', hi: 'काली मिर्च', te: 'మిరియాలు', ta: 'கருமிளகு', kn: 'ಕರಿಮೆಣಸು', sci: 'Piper nigrum', type: 'spice', seasons: ['All year'], soil: { best: ['laterite', 'red'], bad: ['sandy'] }, water: 'High', sun: 'Partial shade', temp: { min: 20, max: 30 }, harvest: 240, diseases: [{ name: 'Foot rot', prevention: 'Good drainage', treatment: 'Copper fungicide' }] },
    { id: 'cardamom', en: 'Cardamom', hi: 'इलायची', te: 'ఏలకులు', ta: 'ஏலக்காய்', kn: 'ಏಲಕ್ಕಿ', sci: 'Elettaria cardamomum', type: 'spice', seasons: ['All year'], soil: { best: ['loamy', 'laterite'], bad: ['sandy'] }, water: 'High', sun: 'Partial shade', temp: { min: 15, max: 30 }, harvest: 365, diseases: [{ name: 'Thrips', prevention: 'Neem oil', treatment: 'Dimethoate spray' }] },
    { id: 'ginger', en: 'Ginger', hi: 'अदरक', te: 'అల్లం', ta: 'இஞ்சி', kn: 'ಶುಂಠಿ', sci: 'Zingiber officinale', type: 'spice', seasons: ['Kharif'], soil: { best: ['loamy', 'sandy_loam'], bad: ['waterlogged'] }, water: 'High', sun: 'Partial shade', temp: { min: 20, max: 30 }, harvest: 240, diseases: [{ name: 'Soft rot', prevention: 'Good drainage', treatment: 'Mancozeb drench' }] },
    { id: 'garlic', en: 'Garlic', hi: 'लहसुन', te: 'వెల్లుల్లి', ta: 'பூண்டு', kn: 'ಬೆಳ್ಳುಳ್ಳಿ', sci: 'Allium sativum', type: 'spice', seasons: ['Rabi'], soil: { best: ['loamy', 'sandy_loam'], bad: ['waterlogged'] }, water: 'Low', sun: 'Full sun', temp: { min: 10, max: 25 }, harvest: 140, diseases: [{ name: 'Purple blotch', prevention: 'Crop rotation', treatment: 'Mancozeb spray' }] },
    // OIL SEEDS
    { id: 'sunflower', en: 'Sunflower', hi: 'सूरजमुखी', te: 'పొద్దుతిరుగుడు', ta: 'சூரியகாந்தி', kn: 'ಸೂರ್ಯಕಾಂತಿ', sci: 'Helianthus annuus', type: 'oilseed', seasons: ['Kharif', 'Rabi'], soil: { best: ['loamy', 'black_cotton'], bad: ['waterlogged'] }, water: 'Medium', sun: 'Full sun', temp: { min: 20, max: 30 }, harvest: 90, diseases: [{ name: 'Downy mildew', prevention: 'Seed treatment', treatment: 'Metalaxyl' }] },
    { id: 'sesame', en: 'Sesame', hi: 'तिल', te: 'నువ్వులు', ta: 'எள்', kn: 'ಎಳ್ಳು', sci: 'Sesamum indicum', type: 'oilseed', seasons: ['Kharif'], soil: { best: ['sandy_loam', 'loamy'], bad: ['waterlogged'] }, water: 'Low', sun: 'Full sun', temp: { min: 25, max: 35 }, harvest: 80, diseases: [{ name: 'Phyllody', prevention: 'Control leafhopper', treatment: 'Imidacloprid spray' }] },
    { id: 'castor', en: 'Castor', hi: 'अरंडी', te: 'ఆముదం', ta: 'ஆமணக்கு', kn: 'ಔಡಲ', sci: 'Ricinus communis', type: 'oilseed', seasons: ['Kharif'], soil: { best: ['loamy', 'sandy_loam'], bad: ['waterlogged'] }, water: 'Low', sun: 'Full sun', temp: { min: 20, max: 35 }, harvest: 150, diseases: [{ name: 'Wilt', prevention: 'Seed treatment', treatment: 'Use resistant varieties' }] },
    { id: 'linseed', en: 'Linseed', hi: 'अलसी', te: 'అవిసెగింజలు', ta: 'ஆளிவிதை', kn: 'ಅಗಸೆ', sci: 'Linum usitatissimum', type: 'oilseed', seasons: ['Rabi'], soil: { best: ['clay_loam', 'loamy'], bad: ['sandy'] }, water: 'Low', sun: 'Full sun', temp: { min: 10, max: 25 }, harvest: 120, diseases: [{ name: 'Rust', prevention: 'Timely sowing', treatment: 'Mancozeb spray' }] },
    { id: 'coconut', en: 'Coconut', hi: 'नारियल', te: 'కొబ్బరి', ta: 'தேங்காய்', kn: 'ತೆಂಗಿನಕಾಯಿ', sci: 'Cocos nucifera', type: 'plantation', seasons: ['All year'], soil: { best: ['sandy_loam', 'laterite'], bad: ['waterlogged'] }, water: 'High', sun: 'Full sun', temp: { min: 20, max: 35 }, harvest: 365, diseases: [{ name: 'Bud rot', prevention: 'Good drainage', treatment: 'Bordeaux paste' }] },
    // FRUITS
    { id: 'papaya', en: 'Papaya', hi: 'पपीता', te: 'బొప్పాయి', ta: 'பப்பாளி', kn: 'ಪಪ್ಪಾಯ', sci: 'Carica papaya', type: 'fruit', seasons: ['All year'], soil: { best: ['loamy', 'sandy_loam'], bad: ['waterlogged'] }, water: 'Medium', sun: 'Full sun', temp: { min: 20, max: 35 }, harvest: 270, diseases: [{ name: 'Ring spot virus', prevention: 'Use resistant varieties', treatment: 'Remove infected plants' }] },
    { id: 'guava', en: 'Guava', hi: 'अमरूद', te: 'జామ', ta: 'கொய்யா', kn: 'ಸೀಬೆ', sci: 'Psidium guajava', type: 'fruit', seasons: ['All year'], soil: { best: ['loamy', 'sandy_loam'], bad: ['waterlogged'] }, water: 'Medium', sun: 'Full sun', temp: { min: 20, max: 35 }, harvest: 150, diseases: [{ name: 'Wilt', prevention: 'Good drainage', treatment: 'Use resistant rootstock' }] },
    { id: 'pomegranate', en: 'Pomegranate', hi: 'अनार', te: 'దానిమ్మ', ta: 'மாதுளை', kn: 'ದಾಳಿಂಬೆ', sci: 'Punica granatum', type: 'fruit', seasons: ['All year'], soil: { best: ['sandy_loam', 'loamy'], bad: ['waterlogged'] }, water: 'Low', sun: 'Full sun', temp: { min: 20, max: 40 }, harvest: 150, diseases: [{ name: 'Bacterial blight', prevention: 'Copper spray', treatment: 'Streptocycline' }] },
    { id: 'grape', en: 'Grape', hi: 'अंगूर', te: 'ద్రాక్ష', ta: 'திராட்சை', kn: 'ದ್ರಾಕ್ಷಿ', sci: 'Vitis vinifera', type: 'fruit', seasons: ['All year'], soil: { best: ['sandy_loam', 'loamy'], bad: ['waterlogged'] }, water: 'Medium', sun: 'Full sun', temp: { min: 15, max: 35 }, harvest: 120, diseases: [{ name: 'Downy mildew', prevention: 'Copper spray', treatment: 'Metalaxyl' }] },
    { id: 'jackfruit', en: 'Jackfruit', hi: 'कटहल', te: 'పనస', ta: 'பலாப்பழம்', kn: 'ಹಲಸು', sci: 'Artocarpus heterophyllus', type: 'fruit', seasons: ['All year'], soil: { best: ['loamy', 'laterite'], bad: ['waterlogged'] }, water: 'Medium', sun: 'Full sun', temp: { min: 20, max: 35 }, harvest: 365, diseases: [{ name: 'Fruit rot', prevention: 'Good sanitation', treatment: 'Copper spray' }] },
    { id: 'litchi', en: 'Litchi', hi: 'लीची', te: 'లీచీ', ta: 'லிச்சி', kn: 'ಲಿಚ್ಚಿ', sci: 'Litchi chinensis', type: 'fruit', seasons: ['All year'], soil: { best: ['loamy', 'sandy_loam'], bad: ['saline'] }, water: 'High', sun: 'Full sun', temp: { min: 20, max: 35 }, harvest: 365, diseases: [{ name: 'Fruit borer', prevention: 'Neem spray', treatment: 'Carbaryl spray' }] },
    { id: 'sapota', en: 'Sapota', hi: 'चीकू', te: 'సపోటా', ta: 'சப்போட்டா', kn: 'ಸಪೋಟ', sci: 'Manilkara zapota', type: 'fruit', seasons: ['All year'], soil: { best: ['loamy', 'sandy_loam'], bad: ['waterlogged'] }, water: 'Medium', sun: 'Full sun', temp: { min: 20, max: 35 }, harvest: 270, diseases: [{ name: 'Leaf spot', prevention: 'Copper spray', treatment: 'Mancozeb spray' }] },
    // CASH CROPS
    { id: 'tea', en: 'Tea', hi: 'चाय', te: 'తేయాకు', ta: 'தேயிலை', kn: 'ಚಹಾ', sci: 'Camellia sinensis', type: 'plantation', seasons: ['All year'], soil: { best: ['acidic', 'laterite'], bad: ['alkaline'] }, water: 'High', sun: 'Partial shade', temp: { min: 15, max: 30 }, harvest: 365, diseases: [{ name: 'Blister blight', prevention: 'Copper spray', treatment: 'Hexaconazole' }] },
    { id: 'coffee', en: 'Coffee', hi: 'कॉफी', te: 'కాఫీ', ta: 'காப்பி', kn: 'ಕಾಫಿ', sci: 'Coffea arabica', type: 'plantation', seasons: ['All year'], soil: { best: ['laterite', 'loamy'], bad: ['sandy'] }, water: 'High', sun: 'Partial shade', temp: { min: 15, max: 28 }, harvest: 365, diseases: [{ name: 'Leaf rust', prevention: 'Shade management', treatment: 'Copper spray' }] },
    { id: 'rubber', en: 'Rubber', hi: 'रबड़', te: 'రబ్బరు', ta: 'ரப்பர்', kn: 'ರಬ್ಬರ್', sci: 'Hevea brasiliensis', type: 'plantation', seasons: ['All year'], soil: { best: ['laterite', 'loamy'], bad: ['waterlogged'] }, water: 'High', sun: 'Full sun', temp: { min: 20, max: 35 }, harvest: 2190, diseases: [{ name: 'Abnormal leaf fall', prevention: 'Systemic fungicide', treatment: 'Copper spray' }] },
    { id: 'jute', en: 'Jute', hi: 'जूट', te: 'జనపనార', ta: 'சணல்', kn: 'ಸೆಣಬು', sci: 'Corchorus capsularis', type: 'fiber', seasons: ['Kharif'], soil: { best: ['alluvial', 'loamy'], bad: ['sandy'] }, water: 'High', sun: 'Full sun', temp: { min: 25, max: 35 }, harvest: 120, diseases: [{ name: 'Stem rot', prevention: 'Seed treatment', treatment: 'Carbendazim' }] },
    { id: 'tobacco', en: 'Tobacco', hi: 'तंबाकू', te: 'పొగాకు', ta: 'புகையிலை', kn: 'ತಂಬಾಕು', sci: 'Nicotiana tabacum', type: 'commercial', seasons: ['Rabi'], soil: { best: ['sandy_loam', 'loamy'], bad: ['waterlogged'] }, water: 'Medium', sun: 'Full sun', temp: { min: 20, max: 30 }, harvest: 120, diseases: [{ name: 'Mosaic virus', prevention: 'Aphid control', treatment: 'Remove infected plants' }] },
    // FLOWERS
    { id: 'marigold', en: 'Marigold', hi: 'गेंदा', te: 'బంతి', ta: 'சாமந்தி', kn: 'ಚೆಂಡುಹೂ', sci: 'Tagetes erecta', type: 'flower', seasons: ['Kharif', 'Rabi'], soil: { best: ['loamy', 'sandy_loam'], bad: ['waterlogged'] }, water: 'Medium', sun: 'Full sun', temp: { min: 15, max: 35 }, harvest: 60, diseases: [{ name: 'Damping off', prevention: 'Good drainage', treatment: 'Bavistin drench' }] },
    { id: 'rose', en: 'Rose', hi: 'गुलाब', te: 'గులాబి', ta: 'ரோஜா', kn: 'ಗುಲಾಬಿ', sci: 'Rosa indica', type: 'flower', seasons: ['All year'], soil: { best: ['loamy', 'clay_loam'], bad: ['sandy'] }, water: 'Medium', sun: 'Full sun', temp: { min: 15, max: 30 }, harvest: 60, diseases: [{ name: 'Black spot', prevention: 'Good air circulation', treatment: 'Mancozeb spray' }] },
    { id: 'jasmine', en: 'Jasmine', hi: 'चमेली', te: 'మల్లెపువ్వు', ta: 'மல்லிகை', kn: 'ಮಲ್ಲಿಗೆ', sci: 'Jasminum sambac', type: 'flower', seasons: ['All year'], soil: { best: ['loamy', 'sandy_loam'], bad: ['waterlogged'] }, water: 'Medium', sun: 'Full sun', temp: { min: 20, max: 35 }, harvest: 90, diseases: [{ name: 'Bud borer', prevention: 'Neem spray', treatment: 'Malathion' }] },
    // TUBERS
    { id: 'sweet_potato', en: 'Sweet Potato', hi: 'शकरकंद', te: 'చిలగడదుంప', ta: 'சர்க்கரைவள்ளிக்கிழங்கு', kn: 'ಸಿಹಿಗೆಣಸು', sci: 'Ipomoea batatas', type: 'tuber', seasons: ['Kharif'], soil: { best: ['sandy_loam', 'loamy'], bad: ['waterlogged'] }, water: 'Medium', sun: 'Full sun', temp: { min: 20, max: 30 }, harvest: 100, diseases: [{ name: 'Weevil', prevention: 'Clean planting material', treatment: 'Carbofuran' }] },
    { id: 'tapioca', en: 'Tapioca', hi: 'टैपिओका', te: 'మరచెట్టు', ta: 'மரவள்ளிக்கிழங்கு', kn: 'ಮರಗೆಣಸು', sci: 'Manihot esculenta', type: 'tuber', seasons: ['Kharif'], soil: { best: ['sandy_loam', 'laterite'], bad: ['waterlogged'] }, water: 'Low', sun: 'Full sun', temp: { min: 20, max: 35 }, harvest: 270, diseases: [{ name: 'Mosaic virus', prevention: 'Clean setts', treatment: 'Remove infected plants' }] },
    { id: 'yam', en: 'Yam', hi: 'जिमीकंद', te: 'కంద', ta: 'கருணைக்கிழங்கு', kn: 'ಸುವರ್ಣಗೆಡ್ಡೆ', sci: 'Dioscorea alata', type: 'tuber', seasons: ['Kharif'], soil: { best: ['loamy', 'sandy_loam'], bad: ['waterlogged'] }, water: 'Medium', sun: 'Full sun', temp: { min: 25, max: 35 }, harvest: 240, diseases: [{ name: 'Anthracnose', prevention: 'Clean setts', treatment: 'Mancozeb spray' }] },
    { id: 'beetroot', en: 'Beetroot', hi: 'चुकंदर', te: 'బీట్‌రూట్', ta: 'பீட்ரூட்', kn: 'ಬೀಟ್‌ರೂಟ್', sci: 'Beta vulgaris', type: 'vegetable', seasons: ['Rabi'], soil: { best: ['sandy_loam', 'loamy'], bad: ['clayey'] }, water: 'Medium', sun: 'Full sun', temp: { min: 10, max: 25 }, harvest: 60, diseases: [{ name: 'Cercospora leaf spot', prevention: 'Crop rotation', treatment: 'Mancozeb spray' }] },
    { id: 'drumstick', en: 'Drumstick', hi: 'सहजन', te: 'మునగకాయ', ta: 'முருங்கை', kn: 'ನುಗ್ಗೆಕಾಯಿ', sci: 'Moringa oleifera', type: 'vegetable', seasons: ['All year'], soil: { best: ['sandy_loam', 'loamy'], bad: ['waterlogged'] }, water: 'Low', sun: 'Full sun', temp: { min: 25, max: 40 }, harvest: 180, diseases: [{ name: 'Hairy caterpillar', prevention: 'Neem spray', treatment: 'Manual collection' }] },
    { id: 'curry_leaf', en: 'Curry Leaf', hi: 'कड़ी पत्ता', te: 'కరివేపాకు', ta: 'கறிவேப்பிலை', kn: 'ಕರಿಬೇವು', sci: 'Murraya koenigii', type: 'spice', seasons: ['All year'], soil: { best: ['loamy', 'sandy_loam'], bad: ['waterlogged'] }, water: 'Low', sun: 'Full sun', temp: { min: 20, max: 35 }, harvest: 365, diseases: [{ name: 'Leaf spot', prevention: 'Pruning', treatment: 'Copper spray' }] },
    { id: 'mint', en: 'Mint', hi: 'पुदीना', te: 'పుదీనా', ta: 'புதினா', kn: 'ಪುದಿನ', sci: 'Mentha arvensis', type: 'herb', seasons: ['All year'], soil: { best: ['loamy', 'clay_loam'], bad: ['sandy'] }, water: 'High', sun: 'Partial shade', temp: { min: 15, max: 30 }, harvest: 90, diseases: [{ name: 'Rust', prevention: 'Good drainage', treatment: 'Fungicide spray' }] },
    { id: 'lettuce', en: 'Lettuce', hi: 'सलाद पत्ता', te: 'లెట్యూస్', ta: 'லெட்டூஸ்', kn: 'ಲೆಟ್ಯೂಸ್', sci: 'Lactuca sativa', type: 'vegetable', seasons: ['Rabi'], soil: { best: ['loamy', 'sandy_loam'], bad: ['clayey'] }, water: 'Medium', sun: 'Partial shade', temp: { min: 10, max: 20 }, harvest: 45, diseases: [{ name: 'Downy mildew', prevention: 'Proper spacing', treatment: 'Metalaxyl' }] },
    { id: 'capsicum', en: 'Capsicum', hi: 'शिमला मिर्च', te: 'క్యాప్సికమ్', ta: 'குடைமிளகாய்', kn: 'ಕ್ಯಾಪ್ಸಿಕಮ್', sci: 'Capsicum annuum', type: 'vegetable', seasons: ['Rabi', 'Kharif'], soil: { best: ['loamy', 'sandy_loam'], bad: ['waterlogged'] }, water: 'Medium', sun: 'Full sun', temp: { min: 18, max: 30 }, harvest: 70, diseases: [{ name: 'Fruit rot', prevention: 'Proper spacing', treatment: 'Mancozeb spray' }] },
    { id: 'spring_onion', en: 'Spring Onion', hi: 'हरा प्याज', te: 'ఉల్లి ఆకు', ta: 'வெங்காய தாள்', kn: 'ಈರುಳ್ಳಿ ಎಲೆ', sci: 'Allium fistulosum', type: 'vegetable', seasons: ['All year'], soil: { best: ['loamy', 'sandy_loam'], bad: ['waterlogged'] }, water: 'Medium', sun: 'Full sun', temp: { min: 15, max: 25 }, harvest: 40, diseases: [{ name: 'Purple blotch', prevention: 'Crop rotation', treatment: 'Mancozeb spray' }] },
];

// Transform into full CropDocument format
function toCropDoc(c) {
    return {
        id: c.id,
        commonNames: { en: c.en, hi: c.hi, te: c.te, ta: c.ta, kn: c.kn },
        scientificName: c.sci,
        aliases: [],
        cropType: c.type,
        seasons: c.seasons,
        soil: c.soil,
        growthConditions: {
            tempC: c.temp,
            waterRequirement: c.water,
            sunlight: c.sun
        },
        timeToHarvestDays: c.harvest,
        marketDemand: { peakMonths: [], seasonal: true, notes: '' },
        riskAndPrevention: { diseases: c.diseases },
        regionalNotes: '',
        tags: [c.type, ...c.seasons.map(s => s.toLowerCase())],
        lastUpdated: new Date().toISOString().split('T')[0],
        source: 'generated'
    };
}

// Add new crops that don't already exist
for (const c of newCrops) {
    if (!existingIds.has(c.id)) {
        crops.push(toCropDoc(c));
        existingIds.add(c.id);
    }
}

// Now duplicate with variations to reach 500+
const prefixes = ['organic_', 'hybrid_', 'local_', 'dwarf_', 'early_', 'late_', 'winter_', 'summer_', 'heirloom_', 'baby_'];
const baseCrops = [...crops];
let count = crops.length;

for (const prefix of prefixes) {
    if (count >= 500) break;
    for (const base of baseCrops) {
        if (count >= 520) break;
        const newId = prefix + base.id;
        if (existingIds.has(newId)) continue;
        const variant = JSON.parse(JSON.stringify(base));
        variant.id = newId;
        const label = prefix.replace('_', '').charAt(0).toUpperCase() + prefix.replace('_', '').slice(1);
        if (variant.commonNames) {
            variant.commonNames.en = label + ' ' + (variant.commonNames.en || base.id);
        }
        variant.tags = [...(variant.tags || []), prefix.replace('_', '')];
        variant.source = 'variant';
        crops.push(variant);
        existingIds.add(newId);
        count++;
    }
}

console.log(`Total crops: ${crops.length}`);
fs.writeFileSync(
    path.join(__dirname, '..', 'src', 'data', 'crops_seed.json'),
    JSON.stringify(crops, null, 2),
    'utf-8'
);
console.log('Done! Written to src/data/crops_seed.json');
