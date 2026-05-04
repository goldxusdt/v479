// Comprehensive list of states/provinces by country with their cities

export interface StateData {
  name: string;
  cities: string[];
}

export interface CountryStates {
  [country: string]: StateData[];
}

export const countryStates: CountryStates = {
  'United States': [
    { name: 'California', cities: ['Los Angeles', 'San Francisco', 'San Diego', 'Sacramento', 'San Jose'] },
    { name: 'Texas', cities: ['Houston', 'Dallas', 'Austin', 'San Antonio', 'Fort Worth'] },
    { name: 'Florida', cities: ['Miami', 'Orlando', 'Tampa', 'Jacksonville', 'Fort Lauderdale'] },
    { name: 'New York', cities: ['New York City', 'Buffalo', 'Rochester', 'Albany', 'Syracuse'] },
    { name: 'Illinois', cities: ['Chicago', 'Aurora', 'Naperville', 'Joliet', 'Rockford'] },
    { name: 'Pennsylvania', cities: ['Philadelphia', 'Pittsburgh', 'Allentown', 'Erie', 'Reading'] },
    { name: 'Ohio', cities: ['Columbus', 'Cleveland', 'Cincinnati', 'Toledo', 'Akron'] },
    { name: 'Georgia', cities: ['Atlanta', 'Augusta', 'Columbus', 'Savannah', 'Athens'] },
    { name: 'North Carolina', cities: ['Charlotte', 'Raleigh', 'Greensboro', 'Durham', 'Winston-Salem'] },
    { name: 'Michigan', cities: ['Detroit', 'Grand Rapids', 'Warren', 'Sterling Heights', 'Ann Arbor'] }
  ],
  'India': [
    { name: 'Maharashtra', cities: ['Mumbai', 'Pune', 'Nagpur', 'Thane', 'Nashik'] },
    { name: 'Karnataka', cities: ['Bangalore', 'Mysore', 'Mangalore', 'Hubli', 'Belgaum'] },
    { name: 'Tamil Nadu', cities: ['Chennai', 'Coimbatore', 'Madurai', 'Tiruchirappalli', 'Salem'] },
    { name: 'Delhi', cities: ['New Delhi', 'Delhi', 'Dwarka', 'Rohini', 'Janakpuri'] },
    { name: 'Gujarat', cities: ['Ahmedabad', 'Surat', 'Vadodara', 'Rajkot', 'Bhavnagar'] },
    { name: 'Rajasthan', cities: ['Jaipur', 'Jodhpur', 'Udaipur', 'Kota', 'Ajmer'] },
    { name: 'West Bengal', cities: ['Kolkata', 'Howrah', 'Durgapur', 'Asansol', 'Siliguri'] },
    { name: 'Uttar Pradesh', cities: ['Lucknow', 'Kanpur', 'Agra', 'Varanasi', 'Meerut'] },
    { name: 'Telangana', cities: ['Hyderabad', 'Warangal', 'Nizamabad', 'Khammam', 'Karimnagar'] },
    { name: 'Kerala', cities: ['Thiruvananthapuram', 'Kochi', 'Kozhikode', 'Thrissur', 'Kollam'] }
  ],
  'United Kingdom': [
    { name: 'England', cities: ['London', 'Manchester', 'Birmingham', 'Liverpool', 'Leeds'] },
    { name: 'Scotland', cities: ['Edinburgh', 'Glasgow', 'Aberdeen', 'Dundee', 'Inverness'] },
    { name: 'Wales', cities: ['Cardiff', 'Swansea', 'Newport', 'Wrexham', 'Barry'] },
    { name: 'Northern Ireland', cities: ['Belfast', 'Derry', 'Lisburn', 'Newry', 'Armagh'] }
  ],
  'Canada': [
    { name: 'Ontario', cities: ['Toronto', 'Ottawa', 'Mississauga', 'Hamilton', 'London'] },
    { name: 'Quebec', cities: ['Montreal', 'Quebec City', 'Laval', 'Gatineau', 'Longueuil'] },
    { name: 'British Columbia', cities: ['Vancouver', 'Victoria', 'Surrey', 'Burnaby', 'Richmond'] },
    { name: 'Alberta', cities: ['Calgary', 'Edmonton', 'Red Deer', 'Lethbridge', 'Medicine Hat'] },
    { name: 'Manitoba', cities: ['Winnipeg', 'Brandon', 'Steinbach', 'Thompson', 'Portage la Prairie'] }
  ],
  'Australia': [
    { name: 'New South Wales', cities: ['Sydney', 'Newcastle', 'Wollongong', 'Central Coast', 'Maitland'] },
    { name: 'Victoria', cities: ['Melbourne', 'Geelong', 'Ballarat', 'Bendigo', 'Shepparton'] },
    { name: 'Queensland', cities: ['Brisbane', 'Gold Coast', 'Sunshine Coast', 'Townsville', 'Cairns'] },
    { name: 'Western Australia', cities: ['Perth', 'Mandurah', 'Bunbury', 'Kalgoorlie', 'Geraldton'] },
    { name: 'South Australia', cities: ['Adelaide', 'Mount Gambier', 'Whyalla', 'Murray Bridge', 'Port Augusta'] }
  ],
  'Germany': [
    { name: 'Bavaria', cities: ['Munich', 'Nuremberg', 'Augsburg', 'Regensburg', 'Ingolstadt'] },
    { name: 'North Rhine-Westphalia', cities: ['Cologne', 'Düsseldorf', 'Dortmund', 'Essen', 'Duisburg'] },
    { name: 'Baden-Württemberg', cities: ['Stuttgart', 'Mannheim', 'Karlsruhe', 'Freiburg', 'Heidelberg'] },
    { name: 'Berlin', cities: ['Berlin'] },
    { name: 'Hamburg', cities: ['Hamburg'] }
  ],
  'France': [
    { name: 'Île-de-France', cities: ['Paris', 'Versailles', 'Boulogne-Billancourt', 'Saint-Denis', 'Argenteuil'] },
    { name: 'Provence-Alpes-Côte d\'Azur', cities: ['Marseille', 'Nice', 'Toulon', 'Aix-en-Provence', 'Cannes'] },
    { name: 'Auvergne-Rhône-Alpes', cities: ['Lyon', 'Grenoble', 'Saint-Étienne', 'Villeurbanne', 'Clermont-Ferrand'] },
    { name: 'Nouvelle-Aquitaine', cities: ['Bordeaux', 'Limoges', 'Poitiers', 'La Rochelle', 'Pau'] },
    { name: 'Occitanie', cities: ['Toulouse', 'Montpellier', 'Nîmes', 'Perpignan', 'Béziers'] }
  ],
  'China': [
    { name: 'Beijing', cities: ['Beijing'] },
    { name: 'Shanghai', cities: ['Shanghai'] },
    { name: 'Guangdong', cities: ['Guangzhou', 'Shenzhen', 'Dongguan', 'Foshan', 'Zhuhai'] },
    { name: 'Zhejiang', cities: ['Hangzhou', 'Ningbo', 'Wenzhou', 'Shaoxing', 'Taizhou'] },
    { name: 'Jiangsu', cities: ['Nanjing', 'Suzhou', 'Wuxi', 'Changzhou', 'Nantong'] }
  ],
  'Japan': [
    { name: 'Tokyo', cities: ['Tokyo', 'Shinjuku', 'Shibuya', 'Minato', 'Chiyoda'] },
    { name: 'Osaka', cities: ['Osaka', 'Sakai', 'Higashiosaka', 'Toyonaka', 'Suita'] },
    { name: 'Kanagawa', cities: ['Yokohama', 'Kawasaki', 'Sagamihara', 'Fujisawa', 'Yokosuka'] },
    { name: 'Aichi', cities: ['Nagoya', 'Toyota', 'Okazaki', 'Ichinomiya', 'Kasugai'] },
    { name: 'Hokkaido', cities: ['Sapporo', 'Asahikawa', 'Hakodate', 'Kushiro', 'Obihiro'] }
  ],
  'Brazil': [
    { name: 'São Paulo', cities: ['São Paulo', 'Campinas', 'Santos', 'São José dos Campos', 'Ribeirão Preto'] },
    { name: 'Rio de Janeiro', cities: ['Rio de Janeiro', 'Niterói', 'Duque de Caxias', 'Nova Iguaçu', 'Belford Roxo'] },
    { name: 'Minas Gerais', cities: ['Belo Horizonte', 'Uberlândia', 'Contagem', 'Juiz de Fora', 'Betim'] },
    { name: 'Bahia', cities: ['Salvador', 'Feira de Santana', 'Vitória da Conquista', 'Camaçari', 'Itabuna'] },
    { name: 'Paraná', cities: ['Curitiba', 'Londrina', 'Maringá', 'Ponta Grossa', 'Cascavel'] }
  ],
  'Mexico': [
    { name: 'Mexico City', cities: ['Mexico City'] },
    { name: 'Jalisco', cities: ['Guadalajara', 'Zapopan', 'Tlaquepaque', 'Tonalá', 'Puerto Vallarta'] },
    { name: 'Nuevo León', cities: ['Monterrey', 'Guadalupe', 'San Nicolás de los Garza', 'Apodaca', 'Santa Catarina'] },
    { name: 'Puebla', cities: ['Puebla', 'Tehuacán', 'San Martín Texmelucan', 'Atlixco', 'Cholula'] },
    { name: 'Guanajuato', cities: ['León', 'Irapuato', 'Celaya', 'Salamanca', 'Guanajuato'] }
  ],
  'Italy': [
    { name: 'Lazio', cities: ['Rome', 'Latina', 'Guidonia Montecelio', 'Fiumicino', 'Aprilia'] },
    { name: 'Lombardy', cities: ['Milan', 'Brescia', 'Monza', 'Bergamo', 'Como'] },
    { name: 'Campania', cities: ['Naples', 'Salerno', 'Giugliano in Campania', 'Torre del Greco', 'Pozzuoli'] },
    { name: 'Sicily', cities: ['Palermo', 'Catania', 'Messina', 'Syracuse', 'Marsala'] },
    { name: 'Veneto', cities: ['Venice', 'Verona', 'Padua', 'Vicenza', 'Treviso'] }
  ],
  'Spain': [
    { name: 'Madrid', cities: ['Madrid', 'Móstoles', 'Alcalá de Henares', 'Fuenlabrada', 'Leganés'] },
    { name: 'Catalonia', cities: ['Barcelona', 'Hospitalet de Llobregat', 'Badalona', 'Terrassa', 'Sabadell'] },
    { name: 'Andalusia', cities: ['Seville', 'Málaga', 'Córdoba', 'Granada', 'Jerez de la Frontera'] },
    { name: 'Valencia', cities: ['Valencia', 'Alicante', 'Elche', 'Castellón de la Plana', 'Torrent'] },
    { name: 'Basque Country', cities: ['Bilbao', 'Vitoria-Gasteiz', 'San Sebastián', 'Barakaldo', 'Getxo'] }
  ],
  'South Korea': [
    { name: 'Seoul', cities: ['Seoul', 'Gangnam', 'Songpa', 'Gangdong', 'Nowon'] },
    { name: 'Busan', cities: ['Busan', 'Haeundae', 'Suyeong', 'Sasang', 'Busanjin'] },
    { name: 'Incheon', cities: ['Incheon', 'Namdong', 'Bupyeong', 'Seo', 'Yeonsu'] },
    { name: 'Gyeonggi', cities: ['Suwon', 'Seongnam', 'Goyang', 'Yongin', 'Bucheon'] },
    { name: 'Daegu', cities: ['Daegu', 'Suseong', 'Dalseo', 'Buk', 'Nam'] }
  ],
  'Russia': [
    { name: 'Moscow', cities: ['Moscow'] },
    { name: 'Saint Petersburg', cities: ['Saint Petersburg'] },
    { name: 'Moscow Oblast', cities: ['Balashikha', 'Khimki', 'Podolsk', 'Mytishchi', 'Korolev'] },
    { name: 'Krasnodar Krai', cities: ['Krasnodar', 'Sochi', 'Novorossiysk', 'Armavir', 'Yeisk'] },
    { name: 'Sverdlovsk Oblast', cities: ['Yekaterinburg', 'Nizhny Tagil', 'Kamensk-Uralsky', 'Pervouralsk', 'Serov'] }
  ],
  'Indonesia': [
    { name: 'Jakarta', cities: ['Jakarta', 'Central Jakarta', 'West Jakarta', 'South Jakarta', 'East Jakarta'] },
    { name: 'West Java', cities: ['Bandung', 'Bekasi', 'Depok', 'Bogor', 'Cimahi'] },
    { name: 'East Java', cities: ['Surabaya', 'Malang', 'Kediri', 'Probolinggo', 'Blitar'] },
    { name: 'Bali', cities: ['Denpasar', 'Ubud', 'Kuta', 'Seminyak', 'Sanur'] },
    { name: 'Central Java', cities: ['Semarang', 'Surakarta', 'Salatiga', 'Pekalongan', 'Tegal'] }
  ],
  'Turkey': [
    { name: 'Istanbul', cities: ['Istanbul', 'Kadıköy', 'Üsküdar', 'Beşiktaş', 'Şişli'] },
    { name: 'Ankara', cities: ['Ankara', 'Çankaya', 'Keçiören', 'Yenimahalle', 'Mamak'] },
    { name: 'Izmir', cities: ['Izmir', 'Konak', 'Karşıyaka', 'Bornova', 'Buca'] },
    { name: 'Antalya', cities: ['Antalya', 'Alanya', 'Manavgat', 'Kemer', 'Side'] },
    { name: 'Bursa', cities: ['Bursa', 'Osmangazi', 'Nilüfer', 'Yıldırım', 'Gemlik'] }
  ],
  'Saudi Arabia': [
    { name: 'Riyadh', cities: ['Riyadh', 'Al Kharj', 'Ad Diriyah', 'Al Majmaah', 'Az Zulfi'] },
    { name: 'Makkah', cities: ['Mecca', 'Jeddah', 'Taif', 'Rabigh', 'Khulais'] },
    { name: 'Eastern Province', cities: ['Dammam', 'Khobar', 'Dhahran', 'Jubail', 'Qatif'] },
    { name: 'Madinah', cities: ['Medina', 'Yanbu', 'Al Ula', 'Badr', 'Khaybar'] },
    { name: 'Asir', cities: ['Abha', 'Khamis Mushait', 'Najran', 'Bisha', 'Muhayil'] }
  ],
  'United Arab Emirates': [
    { name: 'Dubai', cities: ['Dubai', 'Deira', 'Bur Dubai', 'Jumeirah', 'Dubai Marina'] },
    { name: 'Abu Dhabi', cities: ['Abu Dhabi', 'Al Ain', 'Ruwais', 'Madinat Zayed', 'Liwa Oasis'] },
    { name: 'Sharjah', cities: ['Sharjah', 'Kalba', 'Khor Fakkan', 'Dibba Al-Hisn', 'Dhaid'] },
    { name: 'Ajman', cities: ['Ajman', 'Manama', 'Masfout'] },
    { name: 'Ras Al Khaimah', cities: ['Ras Al Khaimah', 'Digdaga', 'Al Jazirah Al Hamra', 'Khatt', 'Rams'] }
  ],
  'Nigeria': [
    { name: 'Lagos', cities: ['Lagos', 'Ikeja', 'Epe', 'Ikorodu', 'Badagry'] },
    { name: 'Kano', cities: ['Kano', 'Wudil', 'Bichi', 'Gwarzo', 'Rano'] },
    { name: 'Oyo', cities: ['Ibadan', 'Ogbomosho', 'Oyo', 'Iseyin', 'Saki'] },
    { name: 'Rivers', cities: ['Port Harcourt', 'Obio-Akpor', 'Bonny', 'Okrika', 'Eleme'] },
    { name: 'Kaduna', cities: ['Kaduna', 'Zaria', 'Kafanchan', 'Kagoro', 'Saminaka'] }
  ],
  'South Africa': [
    { name: 'Gauteng', cities: ['Johannesburg', 'Pretoria', 'Soweto', 'Benoni', 'Boksburg'] },
    { name: 'Western Cape', cities: ['Cape Town', 'Stellenbosch', 'Paarl', 'George', 'Worcester'] },
    { name: 'KwaZulu-Natal', cities: ['Durban', 'Pietermaritzburg', 'Newcastle', 'Richards Bay', 'Ladysmith'] },
    { name: 'Eastern Cape', cities: ['Port Elizabeth', 'East London', 'Mthatha', 'Grahamstown', 'Uitenhage'] },
    { name: 'Mpumalanga', cities: ['Nelspruit', 'Witbank', 'Middelburg', 'Secunda', 'Standerton'] }
  ],
  'Egypt': [
    { name: 'Cairo', cities: ['Cairo', 'Giza', 'Helwan', 'Nasr City', 'Maadi'] },
    { name: 'Alexandria', cities: ['Alexandria', 'Borg El Arab', 'Abu Qir', 'Montaza', 'Agami'] },
    { name: 'Giza', cities: ['Giza', '6th of October City', 'Sheikh Zayed City', 'Dokki', 'Mohandessin'] },
    { name: 'Qalyubia', cities: ['Banha', 'Qalyub', 'Shubra El Kheima', 'El Khanka', 'Kafr Shukr'] },
    { name: 'Sharqia', cities: ['Zagazig', 'Tenth of Ramadan City', 'Bilbeis', 'Faqus', 'Abu Hammad'] }
  ],
  'Argentina': [
    { name: 'Buenos Aires', cities: ['Buenos Aires', 'La Plata', 'Mar del Plata', 'Bahía Blanca', 'Quilmes'] },
    { name: 'Córdoba', cities: ['Córdoba', 'Villa María', 'Río Cuarto', 'San Francisco', 'Villa Carlos Paz'] },
    { name: 'Santa Fe', cities: ['Rosario', 'Santa Fe', 'Rafaela', 'Venado Tuerto', 'Reconquista'] },
    { name: 'Mendoza', cities: ['Mendoza', 'San Rafael', 'Godoy Cruz', 'Luján de Cuyo', 'Maipú'] },
    { name: 'Tucumán', cities: ['San Miguel de Tucumán', 'Yerba Buena', 'Tafí Viejo', 'Banda del Río Salí', 'Concepción'] }
  ],
  'Pakistan': [
    { name: 'Punjab', cities: ['Lahore', 'Faisalabad', 'Rawalpindi', 'Multan', 'Gujranwala'] },
    { name: 'Sindh', cities: ['Karachi', 'Hyderabad', 'Sukkur', 'Larkana', 'Nawabshah'] },
    { name: 'Khyber Pakhtunkhwa', cities: ['Peshawar', 'Mardan', 'Abbottabad', 'Kohat', 'Swat'] },
    { name: 'Balochistan', cities: ['Quetta', 'Gwadar', 'Turbat', 'Khuzdar', 'Sibi'] },
    { name: 'Islamabad', cities: ['Islamabad'] }
  ],
  'Bangladesh': [
    { name: 'Dhaka', cities: ['Dhaka', 'Gazipur', 'Narayanganj', 'Tongi', 'Savar'] },
    { name: 'Chittagong', cities: ['Chittagong', 'Cox\'s Bazar', 'Comilla', 'Feni', 'Rangamati'] },
    { name: 'Khulna', cities: ['Khulna', 'Jessore', 'Satkhira', 'Bagerhat', 'Kushtia'] },
    { name: 'Rajshahi', cities: ['Rajshahi', 'Bogra', 'Pabna', 'Sirajganj', 'Natore'] },
    { name: 'Sylhet', cities: ['Sylhet', 'Moulvibazar', 'Habiganj', 'Sunamganj'] }
  ],
  'Philippines': [
    { name: 'Metro Manila', cities: ['Manila', 'Quezon City', 'Makati', 'Pasig', 'Taguig'] },
    { name: 'Cebu', cities: ['Cebu City', 'Mandaue', 'Lapu-Lapu', 'Talisay', 'Toledo'] },
    { name: 'Davao', cities: ['Davao City', 'Tagum', 'Panabo', 'Digos', 'Mati'] },
    { name: 'Calabarzon', cities: ['Calamba', 'Antipolo', 'Dasmariñas', 'Bacoor', 'Lipa'] },
    { name: 'Central Luzon', cities: ['Angeles', 'San Fernando', 'Malolos', 'Tarlac City', 'Cabanatuan'] }
  ],
  'Vietnam': [
    { name: 'Hanoi', cities: ['Hanoi', 'Ba Đình', 'Hoàn Kiếm', 'Đống Đa', 'Hai Bà Trưng'] },
    { name: 'Ho Chi Minh City', cities: ['Ho Chi Minh City', 'District 1', 'District 3', 'Bình Thạnh', 'Phú Nhuận'] },
    { name: 'Da Nang', cities: ['Da Nang', 'Hải Châu', 'Thanh Khê', 'Sơn Trà', 'Ngũ Hành Sơn'] },
    { name: 'Hai Phong', cities: ['Hai Phong', 'Hồng Bàng', 'Ngô Quyền', 'Lê Chân', 'Hải An'] },
    { name: 'Can Tho', cities: ['Can Tho', 'Ninh Kiều', 'Bình Thủy', 'Cái Răng', 'Ô Môn'] }
  ],
  'Thailand': [
    { name: 'Bangkok', cities: ['Bangkok', 'Phra Nakhon', 'Dusit', 'Nong Chok', 'Bang Rak'] },
    { name: 'Chiang Mai', cities: ['Chiang Mai', 'Hang Dong', 'San Kamphaeng', 'Doi Saket', 'Mae Rim'] },
    { name: 'Phuket', cities: ['Phuket City', 'Patong', 'Kathu', 'Chalong', 'Rawai'] },
    { name: 'Chonburi', cities: ['Pattaya', 'Chonburi', 'Si Racha', 'Bang Lamung', 'Sattahip'] },
    { name: 'Nakhon Ratchasima', cities: ['Nakhon Ratchasima', 'Pak Chong', 'Khorat', 'Bua Yai', 'Sung Noen'] }
  ],
  'Malaysia': [
    { name: 'Kuala Lumpur', cities: ['Kuala Lumpur', 'Cheras', 'Kepong', 'Setapak', 'Bukit Bintang'] },
    { name: 'Selangor', cities: ['Shah Alam', 'Petaling Jaya', 'Subang Jaya', 'Klang', 'Ampang'] },
    { name: 'Johor', cities: ['Johor Bahru', 'Muar', 'Batu Pahat', 'Kluang', 'Pontian'] },
    { name: 'Penang', cities: ['George Town', 'Butterworth', 'Bukit Mertajam', 'Bayan Lepas', 'Tanjung Bungah'] },
    { name: 'Sabah', cities: ['Kota Kinabalu', 'Sandakan', 'Tawau', 'Lahad Datu', 'Keningau'] }
  ],
  'Singapore': [
    { name: 'Central Region', cities: ['Singapore', 'Orchard', 'Marina Bay', 'Chinatown', 'Little India'] }
  ],
  'Poland': [
    { name: 'Masovian', cities: ['Warsaw', 'Radom', 'Płock', 'Siedlce', 'Ostrołęka'] },
    { name: 'Lesser Poland', cities: ['Kraków', 'Tarnów', 'Nowy Sącz', 'Oświęcim', 'Chrzanów'] },
    { name: 'Greater Poland', cities: ['Poznań', 'Kalisz', 'Konin', 'Piła', 'Ostrów Wielkopolski'] },
    { name: 'Silesian', cities: ['Katowice', 'Częstochowa', 'Sosnowiec', 'Gliwice', 'Zabrze'] },
    { name: 'Lower Silesian', cities: ['Wrocław', 'Wałbrzych', 'Legnica', 'Jelenia Góra', 'Lubin'] }
  ],
  'Netherlands': [
    { name: 'North Holland', cities: ['Amsterdam', 'Haarlem', 'Zaanstad', 'Haarlemmermeer', 'Alkmaar'] },
    { name: 'South Holland', cities: ['Rotterdam', 'The Hague', 'Leiden', 'Dordrecht', 'Zoetermeer'] },
    { name: 'Utrecht', cities: ['Utrecht', 'Amersfoort', 'Veenendaal', 'Nieuwegein', 'Zeist'] },
    { name: 'North Brabant', cities: ['Eindhoven', 'Tilburg', 'Breda', '\'s-Hertogenbosch', 'Helmond'] },
    { name: 'Gelderland', cities: ['Nijmegen', 'Arnhem', 'Apeldoorn', 'Ede', 'Doetinchem'] }
  ],
  'Belgium': [
    { name: 'Brussels', cities: ['Brussels', 'Schaerbeek', 'Anderlecht', 'Ixelles', 'Molenbeek'] },
    { name: 'Antwerp', cities: ['Antwerp', 'Mechelen', 'Turnhout', 'Mol', 'Heist-op-den-Berg'] },
    { name: 'East Flanders', cities: ['Ghent', 'Aalst', 'Sint-Niklaas', 'Dendermonde', 'Eeklo'] },
    { name: 'Flemish Brabant', cities: ['Leuven', 'Vilvoorde', 'Tienen', 'Aarschot', 'Diest'] },
    { name: 'Liège', cities: ['Liège', 'Seraing', 'Verviers', 'Herstal', 'Ans'] }
  ],
  'Sweden': [
    { name: 'Stockholm', cities: ['Stockholm', 'Solna', 'Sundbyberg', 'Nacka', 'Huddinge'] },
    { name: 'Västra Götaland', cities: ['Gothenburg', 'Borås', 'Mölndal', 'Trollhättan', 'Uddevalla'] },
    { name: 'Skåne', cities: ['Malmö', 'Helsingborg', 'Lund', 'Kristianstad', 'Landskrona'] },
    { name: 'Uppsala', cities: ['Uppsala', 'Enköping', 'Tierp', 'Älvkarleby', 'Östhammar'] },
    { name: 'Östergötland', cities: ['Linköping', 'Norrköping', 'Motala', 'Mjölby', 'Finspång'] }
  ],
  'Switzerland': [
    { name: 'Zurich', cities: ['Zurich', 'Winterthur', 'Uster', 'Dübendorf', 'Dietikon'] },
    { name: 'Bern', cities: ['Bern', 'Biel/Bienne', 'Thun', 'Köniz', 'Burgdorf'] },
    { name: 'Geneva', cities: ['Geneva', 'Vernier', 'Lancy', 'Meyrin', 'Carouge'] },
    { name: 'Vaud', cities: ['Lausanne', 'Yverdon-les-Bains', 'Montreux', 'Renens', 'Nyon'] },
    { name: 'Basel-Stadt', cities: ['Basel', 'Riehen', 'Bettingen'] }
  ],
  'Austria': [
    { name: 'Vienna', cities: ['Vienna'] },
    { name: 'Lower Austria', cities: ['St. Pölten', 'Wiener Neustadt', 'Baden', 'Amstetten', 'Klosterneuburg'] },
    { name: 'Upper Austria', cities: ['Linz', 'Wels', 'Steyr', 'Traun', 'Leonding'] },
    { name: 'Styria', cities: ['Graz', 'Leoben', 'Kapfenberg', 'Bruck an der Mur', 'Feldbach'] },
    { name: 'Tyrol', cities: ['Innsbruck', 'Kufstein', 'Schwaz', 'Hall in Tirol', 'Telfs'] }
  ],
  'Norway': [
    { name: 'Oslo', cities: ['Oslo'] },
    { name: 'Viken', cities: ['Drammen', 'Fredrikstad', 'Sarpsborg', 'Sandefjord', 'Tønsberg'] },
    { name: 'Vestland', cities: ['Bergen', 'Stavanger', 'Haugesund', 'Sandnes', 'Askøy'] },
    { name: 'Trøndelag', cities: ['Trondheim', 'Steinkjer', 'Levanger', 'Namsos', 'Orkdal'] },
    { name: 'Rogaland', cities: ['Stavanger', 'Sandnes', 'Haugesund', 'Egersund', 'Bryne'] }
  ],
  'Denmark': [
    { name: 'Capital Region', cities: ['Copenhagen', 'Frederiksberg', 'Gentofte', 'Gladsaxe', 'Lyngby-Taarbæk'] },
    { name: 'Central Denmark', cities: ['Aarhus', 'Randers', 'Horsens', 'Viborg', 'Silkeborg'] },
    { name: 'Southern Denmark', cities: ['Odense', 'Esbjerg', 'Kolding', 'Vejle', 'Sønderborg'] },
    { name: 'Zealand', cities: ['Roskilde', 'Næstved', 'Holbæk', 'Slagelse', 'Køge'] },
    { name: 'North Denmark', cities: ['Aalborg', 'Hjørring', 'Frederikshavn', 'Thisted', 'Brønderslev'] }
  ],
  'Finland': [
    { name: 'Uusimaa', cities: ['Helsinki', 'Espoo', 'Vantaa', 'Kauniainen', 'Kerava'] },
    { name: 'Pirkanmaa', cities: ['Tampere', 'Nokia', 'Ylöjärvi', 'Kangasala', 'Lempäälä'] },
    { name: 'Southwest Finland', cities: ['Turku', 'Salo', 'Raisio', 'Loimaa', 'Naantali'] },
    { name: 'North Ostrobothnia', cities: ['Oulu', 'Raahe', 'Ylivieska', 'Kuusamo', 'Nivala'] },
    { name: 'Lapland', cities: ['Rovaniemi', 'Kemi', 'Tornio', 'Kemijärvi', 'Sodankylä'] }
  ],
  'Greece': [
    { name: 'Attica', cities: ['Athens', 'Piraeus', 'Peristeri', 'Kallithea', 'Nikaia'] },
    { name: 'Central Macedonia', cities: ['Thessaloniki', 'Katerini', 'Serres', 'Veria', 'Kilkis'] },
    { name: 'Crete', cities: ['Heraklion', 'Chania', 'Rethymno', 'Agios Nikolaos', 'Ierapetra'] },
    { name: 'Western Greece', cities: ['Patras', 'Agrinio', 'Messolonghi', 'Pyrgos', 'Amaliada'] },
    { name: 'Central Greece', cities: ['Lamia', 'Chalkida', 'Livadeia', 'Thebes', 'Amfissa'] }
  ],
  'Portugal': [
    { name: 'Lisbon', cities: ['Lisbon', 'Amadora', 'Queluz', 'Loures', 'Odivelas'] },
    { name: 'Porto', cities: ['Porto', 'Vila Nova de Gaia', 'Matosinhos', 'Gondomar', 'Maia'] },
    { name: 'Braga', cities: ['Braga', 'Guimarães', 'Barcelos', 'Famalicão', 'Esposende'] },
    { name: 'Setúbal', cities: ['Setúbal', 'Almada', 'Barreiro', 'Seixal', 'Sesimbra'] },
    { name: 'Faro', cities: ['Faro', 'Portimão', 'Albufeira', 'Loulé', 'Olhão'] }
  ],
  'Czech Republic': [
    { name: 'Prague', cities: ['Prague'] },
    { name: 'Central Bohemian', cities: ['Kladno', 'Mladá Boleslav', 'Příbram', 'Kolín', 'Kutná Hora'] },
    { name: 'South Moravian', cities: ['Brno', 'Znojmo', 'Hodonín', 'Břeclav', 'Vyškov'] },
    { name: 'Moravian-Silesian', cities: ['Ostrava', 'Havířov', 'Opava', 'Karviná', 'Frýdek-Místek'] },
    { name: 'Plzeň', cities: ['Plzeň', 'Klatovy', 'Rokycany', 'Tachov', 'Domažlice'] }
  ],
  'Hungary': [
    { name: 'Budapest', cities: ['Budapest'] },
    { name: 'Pest', cities: ['Érd', 'Gödöllő', 'Vác', 'Cegléd', 'Dunakeszi'] },
    { name: 'Borsod-Abaúj-Zemplén', cities: ['Miskolc', 'Ózd', 'Kazincbarcika', 'Tiszaújváros', 'Sátoraljaújhely'] },
    { name: 'Hajdú-Bihar', cities: ['Debrecen', 'Hajdúböszörmény', 'Hajdúnánás', 'Hajdúszoboszló', 'Berettyóújfalu'] },
    { name: 'Csongrád', cities: ['Szeged', 'Hódmezővásárhely', 'Makó', 'Szentes', 'Mórahalom'] }
  ],
  'Romania': [
    { name: 'Bucharest', cities: ['Bucharest'] },
    { name: 'Cluj', cities: ['Cluj-Napoca', 'Turda', 'Dej', 'Câmpia Turzii', 'Gherla'] },
    { name: 'Timiș', cities: ['Timișoara', 'Lugoj', 'Sânnicolau Mare', 'Jimbolia', 'Făget'] },
    { name: 'Iași', cities: ['Iași', 'Pașcani', 'Hârlău', 'Târgu Frumos', 'Podu Iloaiei'] },
    { name: 'Constanța', cities: ['Constanța', 'Mangalia', 'Medgidia', 'Năvodari', 'Cernavodă'] }
  ],
  'Chile': [
    { name: 'Santiago Metropolitan', cities: ['Santiago', 'Puente Alto', 'Maipú', 'La Florida', 'San Bernardo'] },
    { name: 'Valparaíso', cities: ['Valparaíso', 'Viña del Mar', 'Quilpué', 'Villa Alemana', 'San Antonio'] },
    { name: 'Biobío', cities: ['Concepción', 'Talcahuano', 'Los Ángeles', 'Chillán', 'Coronel'] },
    { name: 'Araucanía', cities: ['Temuco', 'Villarrica', 'Pucón', 'Angol', 'Lautaro'] },
    { name: 'Antofagasta', cities: ['Antofagasta', 'Calama', 'Tocopilla', 'Mejillones', 'Taltal'] }
  ],
  'Colombia': [
    { name: 'Bogotá', cities: ['Bogotá'] },
    { name: 'Antioquia', cities: ['Medellín', 'Bello', 'Itagüí', 'Envigado', 'Apartadó'] },
    { name: 'Valle del Cauca', cities: ['Cali', 'Palmira', 'Buenaventura', 'Tuluá', 'Cartago'] },
    { name: 'Atlántico', cities: ['Barranquilla', 'Soledad', 'Malambo', 'Sabanalarga', 'Puerto Colombia'] },
    { name: 'Santander', cities: ['Bucaramanga', 'Floridablanca', 'Girón', 'Piedecuesta', 'Barrancabermeja'] }
  ],
  'Peru': [
    { name: 'Lima', cities: ['Lima', 'Callao', 'San Juan de Lurigancho', 'San Martín de Porres', 'Ate'] },
    { name: 'Arequipa', cities: ['Arequipa', 'Cayma', 'Cerro Colorado', 'Yanahuara', 'Paucarpata'] },
    { name: 'La Libertad', cities: ['Trujillo', 'Chepén', 'Pacasmayo', 'Ascope', 'Virú'] },
    { name: 'Cusco', cities: ['Cusco', 'Sicuani', 'Urcos', 'Quillabamba', 'Espinar'] },
    { name: 'Piura', cities: ['Piura', 'Sullana', 'Talara', 'Paita', 'Chulucanas'] }
  ],
  'Venezuela': [
    { name: 'Capital District', cities: ['Caracas'] },
    { name: 'Miranda', cities: ['Los Teques', 'Guarenas', 'Guatire', 'Petare', 'Baruta'] },
    { name: 'Zulia', cities: ['Maracaibo', 'Cabimas', 'Ciudad Ojeda', 'Machiques', 'Santa Bárbara'] },
    { name: 'Carabobo', cities: ['Valencia', 'Puerto Cabello', 'Guacara', 'San Diego', 'Los Guayos'] },
    { name: 'Lara', cities: ['Barquisimeto', 'Cabudare', 'Carora', 'El Tocuyo', 'Quíbor'] }
  ],
  'Kenya': [
    { name: 'Nairobi', cities: ['Nairobi', 'Westlands', 'Kasarani', 'Embakasi', 'Dagoretti'] },
    { name: 'Mombasa', cities: ['Mombasa', 'Likoni', 'Changamwe', 'Jomvu', 'Kisauni'] },
    { name: 'Kiambu', cities: ['Thika', 'Kikuyu', 'Ruiru', 'Limuru', 'Kiambu'] },
    { name: 'Nakuru', cities: ['Nakuru', 'Naivasha', 'Gilgil', 'Molo', 'Njoro'] },
    { name: 'Kisumu', cities: ['Kisumu', 'Ahero', 'Maseno', 'Muhoroni', 'Kombewa'] }
  ],
  'Ghana': [
    { name: 'Greater Accra', cities: ['Accra', 'Tema', 'Madina', 'Ashaiman', 'Teshie'] },
    { name: 'Ashanti', cities: ['Kumasi', 'Obuasi', 'Ejisu', 'Mampong', 'Bekwai'] },
    { name: 'Western', cities: ['Sekondi-Takoradi', 'Tarkwa', 'Prestea', 'Axim', 'Elubo'] },
    { name: 'Eastern', cities: ['Koforidua', 'Akosombo', 'Nkawkaw', 'Mpraeso', 'Akim Oda'] },
    { name: 'Northern', cities: ['Tamale', 'Yendi', 'Savelugu', 'Tolon', 'Gushegu'] }
  ],
  'Morocco': [
    { name: 'Casablanca-Settat', cities: ['Casablanca', 'Mohammedia', 'El Jadida', 'Settat', 'Berrechid'] },
    { name: 'Rabat-Salé-Kénitra', cities: ['Rabat', 'Salé', 'Kénitra', 'Témara', 'Skhirat'] },
    { name: 'Fès-Meknès', cities: ['Fès', 'Meknès', 'Taza', 'Sefrou', 'Ifrane'] },
    { name: 'Marrakesh-Safi', cities: ['Marrakesh', 'Safi', 'Essaouira', 'El Kelaa des Sraghna', 'Youssoufia'] },
    { name: 'Tangier-Tétouan-Al Hoceïma', cities: ['Tangier', 'Tétouan', 'Al Hoceïma', 'Larache', 'Ksar El Kebir'] }
  ],
  'Algeria': [
    { name: 'Algiers', cities: ['Algiers', 'Bab El Oued', 'Hussein Dey', 'Kouba', 'Dar El Beïda'] },
    { name: 'Oran', cities: ['Oran', 'Bir El Djir', 'Es Senia', 'Arzew', 'Aïn El Turck'] },
    { name: 'Constantine', cities: ['Constantine', 'El Khroub', 'Aïn Smara', 'Didouche Mourad', 'Hamma Bouziane'] },
    { name: 'Blida', cities: ['Blida', 'Boufarik', 'Bougara', 'Larbaâ', 'Mouzaia'] },
    { name: 'Sétif', cities: ['Sétif', 'El Eulma', 'Aïn Oulmene', 'Bougaa', 'Aïn Arnat'] }
  ],
  'Tunisia': [
    { name: 'Tunis', cities: ['Tunis', 'La Marsa', 'Ariana', 'Ben Arous', 'La Goulette'] },
    { name: 'Sfax', cities: ['Sfax', 'Sakiet Ezzit', 'Sakiet Eddaïer', 'El Hencha', 'Agareb'] },
    { name: 'Sousse', cities: ['Sousse', 'Hammam Sousse', 'Msaken', 'Kalâa Kebira', 'Akouda'] },
    { name: 'Kairouan', cities: ['Kairouan', 'Haffouz', 'Sbikha', 'Nasrallah', 'Chebika'] },
    { name: 'Bizerte', cities: ['Bizerte', 'Menzel Bourguiba', 'Mateur', 'Ras Jebel', 'Sejnane'] }
  ],
  'Ethiopia': [
    { name: 'Addis Ababa', cities: ['Addis Ababa'] },
    { name: 'Oromia', cities: ['Adama', 'Jimma', 'Bishoftu', 'Shashamane', 'Nekemte'] },
    { name: 'Amhara', cities: ['Bahir Dar', 'Gondar', 'Dessie', 'Debre Birhan', 'Debre Markos'] },
    { name: 'Tigray', cities: ['Mekelle', 'Adigrat', 'Axum', 'Shire', 'Adwa'] },
    { name: 'Southern Nations', cities: ['Hawassa', 'Arba Minch', 'Dilla', 'Sodo', 'Hosaena'] }
  ],
  'Tanzania': [
    { name: 'Dar es Salaam', cities: ['Dar es Salaam', 'Kinondoni', 'Ilala', 'Temeke', 'Ubungo'] },
    { name: 'Mwanza', cities: ['Mwanza', 'Nyamagana', 'Ilemela', 'Sengerema', 'Kwimba'] },
    { name: 'Arusha', cities: ['Arusha', 'Moshi', 'Usa River', 'Tengeru', 'Karatu'] },
    { name: 'Dodoma', cities: ['Dodoma', 'Kondoa', 'Mpwapwa', 'Bahi', 'Chamwino'] },
    { name: 'Mbeya', cities: ['Mbeya', 'Tukuyu', 'Kyela', 'Chunya', 'Mbarali'] }
  ],
  'Uganda': [
    { name: 'Central', cities: ['Kampala', 'Entebbe', 'Mukono', 'Wakiso', 'Masaka'] },
    { name: 'Eastern', cities: ['Jinja', 'Mbale', 'Soroti', 'Tororo', 'Iganga'] },
    { name: 'Western', cities: ['Mbarara', 'Fort Portal', 'Kasese', 'Kabale', 'Hoima'] },
    { name: 'Northern', cities: ['Gulu', 'Lira', 'Arua', 'Kitgum', 'Moroto'] }
  ],
  'Zimbabwe': [
    { name: 'Harare', cities: ['Harare', 'Chitungwiza', 'Epworth', 'Norton', 'Ruwa'] },
    { name: 'Bulawayo', cities: ['Bulawayo'] },
    { name: 'Manicaland', cities: ['Mutare', 'Rusape', 'Chipinge', 'Nyanga', 'Chimanimani'] },
    { name: 'Mashonaland East', cities: ['Marondera', 'Murehwa', 'Macheke', 'Wedza', 'Hwedza'] },
    { name: 'Midlands', cities: ['Gweru', 'Kwekwe', 'Redcliff', 'Shurugwi', 'Gokwe'] }
  ],
  'Zambia': [
    { name: 'Lusaka', cities: ['Lusaka', 'Kafue', 'Chilanga', 'Chongwe', 'Luangwa'] },
    { name: 'Copperbelt', cities: ['Kitwe', 'Ndola', 'Mufulira', 'Chingola', 'Luanshya'] },
    { name: 'Southern', cities: ['Livingstone', 'Choma', 'Mazabuka', 'Monze', 'Kalomo'] },
    { name: 'Eastern', cities: ['Chipata', 'Katete', 'Lundazi', 'Petauke', 'Chadiza'] },
    { name: 'Northern', cities: ['Kasama', 'Mbala', 'Mpika', 'Luwingu', 'Mporokoso'] }
  ],
  'Other': [
    { name: 'N/A', cities: ['Other'] }
  ]
};

// Get states for a specific country
export const getStatesForCountry = (country: string): string[] => {
  const states = countryStates[country];
  if (!states) return [];
  return states.map(state => state.name);
};

// Get cities for a specific state in a country
export const getCitiesForState = (country: string, state: string): string[] => {
  const states = countryStates[country];
  if (!states) return [];
  
  const stateData = states.find(s => s.name === state);
  if (!stateData) return [];
  
  return stateData.cities;
};

// Get all countries that have state data
export const getCountriesWithStates = (): string[] => {
  return Object.keys(countryStates);
};
