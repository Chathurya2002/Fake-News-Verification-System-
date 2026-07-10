import csv
import random
from pathlib import Path

# Lists of patterns to generate realistic synthetic news data (English)
real_subjects_en = [
    "The government", "Researchers at the university", "The Federal Reserve", 
    "The city council", "Astronomers", "The Department of Education", 
    "A major healthcare provider", "Microsoft", "The Central Bank", "State officials"
]
real_actions_en = [
    "announced a new program to", "discovered a method to", "released a report on how to", 
    "voted to approve funding for a plan to", "implemented changes to", 
    "raised concerns about the decision to", "conducted a clinical trial to", 
    "launched an initiative to"
]
real_objects_en = [
    "improve public transit systems across the state.", "increase renewable energy production by 20%.", 
    "tackle rising inflation rates through fiscal policy.", "expand access to primary healthcare in rural areas.", 
    "reduce carbon emissions in manufacturing processes.", "enhance cybersecurity measures for online banking."
]

fake_clickbaits_en = ["SHOCKING:", "ALERT:", "EXPOSED:", "WARNING:", "THE TRUTH IS OUT:"]
fake_subjects_en = [
    "A miracle health secret", "A hidden government experiment", "A get-rich-quick loophole", 
    "A secret technology", "An alien artifact found in the forest", "A suppressed clinical report", 
    "A mysterious cure doctors hate"
]
fake_actions_en = [
    "has been exposed by whistleblowers!", "will change your life forever!", 
    "is being hidden from the public by big corporations!", "cures all chronic illnesses in 24 hours!", 
    "can make you $5000 a day from home!"
]
fake_explanations_en = [
    "Doctors want this hidden!", "Watch this video before it gets deleted!", 
    "Big Pharma does not want you to know this!", "This one simple trick bypasses all regulations!"
]

# Lists of patterns to generate realistic synthetic news data (Sinhala)
real_subjects_si = [
    "රජය", "විශ්වවිද්‍යාලයේ පර්යේෂණ කණ්ඩායම", "ශ්‍රී ලංකා මහ බැංකුව", 
    "රාජ්‍ය නිලධාරීන්", "අධ්‍යාපන අමාත්‍යාංශය", "සෞඛ්‍ය අංශ", 
    "නගර සභාව", "පොලීසිය"
]
real_actions_si = [
    "නව ව්‍යාපෘතියක් ආරම්භ කරයි", "වාර්තාවක් නිකුත් කරයි", "යෝජනා ස්ථිර කරයි", 
    "සංශෝධනය කිරීමට තීරණය කරයි", "පරීක්ෂණයක් පවත්වයි", "මහජනතාවට දැනුම් දෙයි",
    "ක්‍රියාත්මක කිරීමට පියවර ගනී", "සැලසුම් අනුමත කරයි"
]
real_objects_si = [
    "ආර්ථිකය නංවාලීම සඳහා.", "පාසල් පද්ධතිය දියුණු කිරීමට.", 
    "සෞඛ්‍ය පහසුකම් පුළුල් කිරීම සඳහා.", "පාරිසරික ගැටළු අවම කිරීමට.", 
    "ජනතාවගේ ආරක්ෂාව තහවුරු කිරීමට.", "අලුත් නීති හඳුන්වා දීමට."
]

fake_clickbaits_si = ["හදිසි අනතුරු ඇඟවීම:", "පුදුම සහගත:", "හෙළිදරව්වක්:", "විශ්වාස කළ නොහැකි:", "රහස එළියට:"]
fake_subjects_si = [
    "ආශ්චර්යමත් සුවය ලබා දෙන රහස්‍ය ඖෂධය", "ලොතරැයි දිනුම් ලබාගන්නා රහස", "රජය සැඟවූ තොරතුරු", 
    "විද්‍යාඥයන් සැඟවූ නව තාක්ෂණය", "අන්තර්ජාලයෙන් දිනකට රුපියල් ලක්ෂයක් උපයන ක්‍රමය", 
    "සියලුම රෝග සුවකරන පානය"
]
fake_actions_si = [
    "දැන් හෙළි වී ඇත!", "ඔබේ ජීවිතය වෙනස් කරනු ඇත!", "ලොවෙන් සඟවා තිබුණි!", 
    "වෛද්‍යවරුන් බියට පත් කර ඇත!", "වහාම මෙය නරඹන්න!"
]
fake_explanations_si = [
    "බෙදාහරින්න කලින් බලන්න!", "මෙම වීඩියෝව මකා දැමීමට පෙර බලන්න!", 
    "සමාගම් මෙය සඟවා තබාගැනීමට උත්සාහ කරයි!", "මෙම සරල උපක්‍රමය මගින් ඔබත් ධනවත් වන්න!"
]

def generate_real_text_en():
    intro = f"{random.choice(real_subjects_en)} {random.choice(real_actions_en)} {random.choice(real_objects_en)}"
    details = "According to official statements, the project has been under development for several months and has received bipartisan support. Analysts suggest this move could lead to long-term improvements in local economies and overall quality of life."
    conclusion = "The implementation of these measures is expected to begin early next quarter, with initial progress reports scheduled for publication in the annual review."
    return f"{intro} {details} {conclusion}"

def generate_fake_text_en():
    headline = f"{random.choice(fake_clickbaits_en)} {random.choice(fake_subjects_en)} {random.choice(fake_actions_en)}"
    details = "A shocking new report reveals that this information is being actively suppressed. Thousands of people are already using it to achieve unbelievable results, but major industries are trying to keep it secret."
    conclusion = f"{random.choice(fake_explanations_en)} Click the link to learn the shocking truth before it is taken down!"
    return f"{headline} {details} {conclusion}"

def generate_real_text_si():
    intro = f"{random.choice(real_subjects_si)} {random.choice(real_actions_si)} {random.choice(real_objects_si)}"
    details = "නිල වාර්තා වලට අනුව මෙම වැඩසටහන මාස ගණනාවක සිට සැලසුම් කර ඇත. මෙය සාර්ථක වීමෙන් ප්‍රදේශයේ විශාල සංවර්ධනයක් අපේක්ෂා කෙරේ."
    conclusion = "ඉදිරි මාසය ඇතුළත මෙම කටයුතු ආරම්භ කිරීමට නියමිත අතර වැඩිදුර තොරතුරු පසුව දැනුම් දෙන බව බලධාරීන් පවසයි."
    return f"{intro} {details} {conclusion}"

def generate_fake_text_si():
    headline = f"{random.choice(fake_clickbaits_si)} {random.choice(fake_subjects_si)} {random.choice(fake_actions_si)}"
    details = "මෙම විශ්වාස කළ නොහැකි තොරතුර දැන් සමාජ මාධ්‍ය හරහා වේගයෙන් පැතිරෙමින් පවතී. විශාල ආයතන මෙය ජනතාවගෙන් සැඟවීමට උත්සාහ කර ඇත."
    conclusion = f"{random.choice(fake_explanations_si)} කරුණාකර හැකි ඉක්මනින් මෙම රහස දැනගන්න!"
    return f"{headline} {details} {conclusion}"

def main():
    output_path = Path("ml/data/processed/news_dataset.csv")
    output_path.parent.mkdir(parents=True, exist_ok=True)
    
    with open(output_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["text", "label"])
        
        # Generate 1000 real and 1000 fake news texts (500 EN + 500 SI for each)
        for _ in range(500):
            writer.writerow([generate_real_text_en(), "real"])
            writer.writerow([generate_fake_text_en(), "fake"])
            writer.writerow([generate_real_text_si(), "real"])
            writer.writerow([generate_fake_text_si(), "fake"])
            
    print(f"Successfully generated 2000 bilingual (EN+SI) synthetic news articles at {output_path}")

if __name__ == "__main__":
    main()
