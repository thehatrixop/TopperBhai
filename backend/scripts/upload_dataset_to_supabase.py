import os
import sys
import time
import openpyxl
from pathlib import Path
from dotenv import load_dotenv
from openai import OpenAI
from groq import Groq

# Add parent dir to path so we can import db module
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from db.supabase_client import supabase

# Constants
STORAGE_BUCKET = "Notes"
EXCEL_PATH = Path("D:/latest pyq/PYQ_Questions.xlsx")
IMAGES_DIR = Path("D:/latest pyq/Images")
DATASET_DIR = Path("D:/prograamming/current project/dataset")

# 10 UGC NET Computer Science topics in database
TOPICS_LIST = [
    "Discrete Structures and Optimization",
    "Computer System Architecture",
    "Programming Languages and Computer Graphics",
    "Database Management Systems",
    "System Software and Operating System",
    "Software Engineering",
    "Data Structures and Algorithms",
    "Theory of Computation and Compilers",
    "Data Communication and Computer Networks",
    "Artificial Intelligence (AI)"
]

# Keywords for rule-based matching to save LLM API calls
TOPIC_KEYWORDS = {
    "Discrete Structures and Optimization": [
        "group theory", "monoid", "isomorphism", "homomorphism", "poset", "lattice", "boolean algebra", 
        "combinatorics", "permutation", "combination", "generating function", "recurrence relation", 
        "graph theory", "euler path", "hamiltonian", "planar graph", "chromatic number", "propositional logic",
        "predicate logic", "tautology", "validity", "linear programming", "simplex method", "duality",
        "transportation problem", "assignment problem", "discrete structures", "optimization"
    ],
    "Computer System Architecture": [
        "multiplexer", "decoder", "flip-flop", "register", "counter", "instruction format", "addressing mode",
        "microprogrammed", "pipeline", "instruction hazard", "cache memory", "cache mapping", "direct mapping",
        "associative memory", "virtual memory", "page replacement", "dma", "interrupt", "cpu", "alu", "8085",
        "microprocessor", "von neumann", "systolic array", " Flynn's taxonomy", "multiprocessor"
    ],
    "Programming Languages and Computer Graphics": [
        "bresenham", "dda", "midpoint line", "clipping", "cohen-sutherland", "liang-barsky", "polygon filling",
        "transformation matrix", "translation", "rotation", "scaling", "homogeneous coordinates", "projection",
        "perspective projection", "orthographic", "bezier curve", "b-spline", "shading", "gouraud", "phong",
        "c++", "java", "constructor", "destructor", "polymorphism", "inheritance", "encapsulation", "abstract class",
        "exception handling", "lambda expression", "multithreading", "garbage collection"
    ],
    "Database Management Systems": [
        "relational model", "relational algebra", "tuple calculus", "sql", "ddl", "dml", "select", "project",
        "join", "natural join", "outer join", "functional dependency", "normalization", "1nf", "2nf", "3nf",
        "bcnf", "4nf", "5nf", "lossless join", "dependency preserving", "transaction", "acid", "concurrency control",
        "locking protocol", "two-phase locking", "2pl", "serializability", "deadlock", "recovery system",
        "log-based recovery", "indexing", "b-tree", "b+ tree", "hashing", "nosql", "data warehousing", "data mining"
    ],
    "System Software and Operating System": [
        "assembler", "linker", "loader", "macro processor", "compiler design", "system software", "process state",
        "thread", "process scheduling", "fcfs", "sjf", "round robin", "priority scheduling", "semaphore",
        "mutex", "critical section", "deadlock avoidance", "banker's algorithm", "deadlock detection", "memory management",
        "paging", "segmentation", "thrashing", "file allocation", "disk scheduling", "sstf", "scan", "c-scan",
        "security", "cryptography", "unix", "linux", "shell programming"
    ],
    "Software Engineering": [
        "software process model", "waterfall", "incremental", "spiral", "rad", "agile", "scrum", "extreme programming",
        "xp", "requirements engineering", "srs", "cohomo", "cocomo", "function point", "software design",
        "coupling", "cohesion", "structure chart", "object oriented design", "software testing", "unit testing",
        "integration testing", "system testing", "white-box testing", "black-box testing", "cyclomatic complexity",
        "software quality", "iso 9126", "cmm", "cmmi", "software configuration management", "scm"
    ],
    "Data Structures and Algorithms": [
        "asymptotic notation", "big o", "omega", "theta", "worst case", "average case", "recurrence tree",
        "master theorem", "sorting", "bubble sort", "insertion sort", "selection sort", "merge sort", "quick sort",
        "heap sort", "radix sort", "searching", "binary search", "hashing", "collision resolution", "stack",
        "queue", "linked list", "binary tree", "binary search tree", "bst", "avl tree", "red-black tree",
        "b-tree", "spanning tree", "shortest path", "dijkstra", "bellman-ford", "floyd-warshall", "prim's",
        "kruskal's", "huffman coding", "fractional knapsack", "job sequencing", "dynamic programming",
        "matrix chain multiplication", "longest common subsequence", "lcs", "0/1 knapsack", "backtracking",
        "n-queen", "branch and bound", "traveling salesperson", "tsp", "np-completeness", "np-hard"
    ],
    "Theory of Computation and Compilers": [
        "finite automata", "dfa", "nfa", "regular language", "regular expression", "pumping lemma",
        "context-free grammar", "cfg", "pushdown automata", "pda", "turing machine", "recursively enumerable",
        "undecidability", "halting problem", "chomsky hierarchy", "lexical analyzer", "parser", "top-down parsing",
        "ll(1)", "bottom-up parsing", "operator precedence", "lr parser", "slr", "lalr", "clr", "syntax-directed translation",
        "s-attributed", "l-attributed", "three-address code", "intermediate code", "code optimization", "loop optimization"
    ],
    "Data Communication and Computer Networks": [
        "osi model", "tcp/ip", "physical layer", "transmission media", "modulation", "multiplexing", "data link layer",
        "framing", "error control", "crc", "hamming code", "flow control", "sliding window", "go-back-n", "selective repeat",
        "mac sublayer", "aloha", "csma/cd", "ethernet", "network layer", "ipv4", "ipv6", "subnetting", "classless addressing",
        "routing algorithm", "distance vector", "link state", "congestion control", "transport layer", "tcp", "udp",
        "three-way handshake", "application layer", "dns", "smtp", "pop", "imap", "http", "ftp", "network security",
        "symmetric key", "asymmetric key", "rsa", "digital signature", "firewall"
    ],
    "Artificial Intelligence (AI)": [
        "artificial intelligence", "turing test", "state space search", "uninformed search", "bfs", "dfs",
        "informed search", "heuristic", "greedy best-first", "a* search", "ao* search", "adversarial search",
        "minimax", "alpha-beta pruning", "constraint satisfaction", "propositional logic", "first-order logic",
        "resolution", "refutation", "probabilistic reasoning", "bayes theorem", "bayesian network", "fuzzy set",
        "membership function", "fuzzy operations", "artificial neural network", "perceptron", "backpropagation",
        "machine learning", "supervised learning", "unsupervised learning", "reinforcement learning", "decision tree",
        "support vector machine", "svm", "clustering", "k-means", "genetic algorithm", "natural language processing",
        "nlp", "expert system"
    ]
}

def retry_on_exception(retries=3, delay=1.0):
    def decorator(func):
        def wrapper(*args, **kwargs):
            last_err = None
            for attempt in range(retries):
                try:
                    return func(*args, **kwargs)
                except Exception as e:
                    last_err = e
                    print(f"    [WARN] Call to {func.__name__} failed (attempt {attempt+1}/{retries}): {e}")
                    time.sleep(delay * (2 ** attempt))
            raise last_err
        return wrapper
    return decorator

# Setup AI Clients
def get_ai_client():
    groq_key = os.getenv("GROQ_API_KEY")
    cerebras_key = os.getenv("CEREBRAS_API_KEY")
    
    if groq_key:
        print("[INFO] Using Groq for topic classification")
        return Groq(api_key=groq_key), "llama-3.1-8b-instant"
    elif cerebras_key:
        print("[INFO] Using Cerebras for topic classification")
        # Use a standard Cerebras model name like llama3.1-8b
        return OpenAI(api_key=cerebras_key, base_url="https://api.cerebras.ai/v1"), "llama3.1-8b"
    else:
        print("[WARN] No CEREBRAS_API_KEY or GROQ_API_KEY found in environment. Classification fallback will use default topic.")
        return None, None

ai_client, ai_model = get_ai_client()

@retry_on_exception(retries=2, delay=0.5)
def classify_with_llm(question_text: str) -> str:
    if not ai_client:
        return "Discrete Structures and Optimization" # Default fallback
        
    system_prompt = f"""You are an elite academic professor in Computer Science.
Classify the following UGC NET Computer Science exam question into exactly one of these 10 topics:
{chr(10).join([f'- {t}' for t in TOPICS_LIST])}

Question:
{question_text}

Return ONLY the exact topic name from the list above. Do not add any explanation, numbering, or introductory/concluding text."""

    user_prompt = "Identify the correct topic for this question."
    
    response = ai_client.chat.completions.create(
        model=ai_model,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ],
        temperature=0.0,
        max_tokens=100
    )
    result = response.choices[0].message.content.strip()
    
    # Try finding an exact case-insensitive substring match
    for t in TOPICS_LIST:
        if t.lower() in result.lower():
            return t
            
    # Fallback default
    return "Discrete Structures and Optimization"

def classify_question(question_text: str) -> str:
    text_lower = question_text.lower()
    
    # Rule-based matching check
    scores = {}
    for topic, keywords in TOPIC_KEYWORDS.items():
        score = 0
        for kw in keywords:
            count = text_lower.count(kw)
            score += count
        if score > 0:
            scores[topic] = score
            
    if scores:
        max_score = max(scores.values())
        candidates = [topic for topic, score in scores.items() if score == max_score]
        if len(candidates) == 1:
            return candidates[0]
            
    # Fallback to LLM if ambiguous or zero score
    return classify_with_llm(question_text)

def upload_file_to_supabase(local_file_path: Path, storage_path: str):
    """Uploads a file to Supabase storage bucket."""
    try:
        with open(local_file_path, "rb") as f:
            supabase.storage.from_(STORAGE_BUCKET).upload(
                path=storage_path,
                file=f,
                file_options={"content-type": "image/png", "x-upsert": "true"}
            )
        print(f"  [STORAGE OK] Uploaded: {local_file_path.name} -> {storage_path}")
        return True
    except Exception as e:
        # Ignore resource already exists errors
        if "already exists" in str(e).lower() or "duplicate" in str(e).lower() or "409" in str(e):
            print(f"  [STORAGE SKIP] File already exists: {local_file_path.name}")
            return True
        else:
            print(f"  [STORAGE FAIL] Failed to upload {local_file_path.name}: {e}")
            return False

def clean_option(opt_val):
    if opt_val is None:
        return ""
    val = str(opt_val).strip()
    
    # Clean leading question designators like "A.", "(A)", "A)", "1.", "(1)"
    # but be careful not to strip meaningful text
    prefixes_to_strip = [
        "A.", "B.", "C.", "D.", "E.", 
        "(A)", "(B)", "(C)", "(D)", "(E)",
        "A)", "B)", "C)", "D)", "E)",
        "1.", "2.", "3.", "4.", 
        "(1)", "(2)", "(3)", "(4)"
    ]
    for prefix in prefixes_to_strip:
        if val.startswith(prefix):
            val = val[len(prefix):].strip()
            break
            
    return val

def clean_answer_key(ans):
    if not ans:
        return "A"
    val = str(ans).strip().upper()
    if "A" in val or "1" in val:
        return "A"
    if "B" in val or "2" in val:
        return "B"
    if "C" in val or "3" in val:
        return "C"
    if "D" in val or "4" in val:
        return "D"
    if "E" in val or "5" in val:
        return "E"
    return "A"

def migrate():
    # 1. Fetch Subject
    print("Fetching Subject from database...")
    subject_res = supabase.table("subjects").select("id").eq("name", "Computer Science and Application").execute()
    if not subject_res.data:
        print("[ERROR] Subject 'Computer Science and Application' not found in database. Please run seed_ugc_net.py first.")
        sys.exit(1)
    subject_id = subject_res.data[0]["id"]
    print(f"Found subject ID: {subject_id}")
    
    # 2. Fetch Topics and map names to IDs
    print("Fetching Topics from database...")
    topics_res = supabase.table("topics").select("id, name").eq("subject_id", subject_id).execute()
    if not topics_res.data:
        print("[ERROR] No topics found in database for the subject.")
        sys.exit(1)
        
    topic_map = {t["name"]: t["id"] for t in topics_res.data}
    print(f"Mapped {len(topic_map)} topics in database.")
    
    # 3. Fetch existing files from storage to optimize validation checks (avoids hundreds of roundtrips)
    print("\nFetching existing files index from Supabase Storage...")
    existing_crop_files = set()
    try:
        res = supabase.storage.from_(STORAGE_BUCKET).list(path="pyq_images", options={"limit": 2000})
        existing_crop_files = {f["name"] for f in res if isinstance(f, dict) and "name" in f}
        print(f"Found {len(existing_crop_files)} existing crop images in Storage.")
    except Exception as e:
        print(f"[WARN] Could not fetch crop images index: {e}")

    existing_page_files = set()
    try:
        res = supabase.storage.from_(STORAGE_BUCKET).list(path="page_images", options={"limit": 2000})
        existing_page_files = {f["name"] for f in res if isinstance(f, dict) and "name" in f}
        print(f"Found {len(existing_page_files)} existing page scans in Storage.")
    except Exception as e:
        print(f"[WARN] Could not fetch page scans index: {e}")

    # 4. Upload crop images to Storage
    print("\n==============================================")
    print("UPLOADING QUESTION IMAGES TO STORAGE")
    print("==============================================")
    if IMAGES_DIR.exists():
        image_files = sorted(list(IMAGES_DIR.glob("*.png")) + list(IMAGES_DIR.glob("*.jpg")))
        print(f"Found {len(image_files)} question images locally.")
        uploaded_count = 0
        skipped_count = 0
        for i, img_path in enumerate(image_files, 1):
            if img_path.name in existing_crop_files:
                skipped_count += 1
                continue
                
            storage_path = f"pyq_images/{img_path.name}"
            if upload_file_to_supabase(img_path, storage_path):
                uploaded_count += 1
            if i % 100 == 0:
                print(f"Progress: {i}/{len(image_files)} images checked/processed")
        print(f"Uploaded {uploaded_count} question images, skipped {skipped_count} existing.")
    else:
        print(f"[WARN] Images directory not found: {IMAGES_DIR}")

    # 5. Upload page scan images to Storage
    print("\n==============================================")
    print("UPLOADING PAGE SCANS TO STORAGE")
    print("==============================================")
    if DATASET_DIR.exists():
        page_files = sorted(list(DATASET_DIR.glob("*.jpg")) + list(DATASET_DIR.glob("*.png")))
        print(f"Found {len(page_files)} page scans locally.")
        uploaded_pages = 0
        skipped_pages = 0
        for i, page_path in enumerate(page_files, 1):
            if page_path.name in existing_page_files:
                skipped_pages += 1
                continue
                
            storage_path = f"page_images/{page_path.name}"
            if upload_file_to_supabase(page_path, storage_path):
                uploaded_pages += 1
            if i % 50 == 0:
                print(f"Progress: {i}/{len(page_files)} pages checked/processed")
        print(f"Uploaded {uploaded_pages} page scan images, skipped {skipped_pages} existing.")
    else:
        print(f"[WARN] Dataset directory not found: {DATASET_DIR}")

    # 5. Load and process Excel file
    print("\n==============================================")
    print("PROCESSING EXCEL AND UPDATING DATABASE TABLE")
    print("==============================================")
    if not EXCEL_PATH.exists():
        print(f"[ERROR] Excel file not found at: {EXCEL_PATH}")
        sys.exit(1)
        
    print("Loading workbook...")
    wb = openpyxl.load_workbook(EXCEL_PATH, data_only=True)
    sheet = wb.active
    
    # Read headers to find columns
    headers = [cell.value for cell in sheet[1]]
    print("Headers in Excel:", headers)
    
    # Map header name to column index (1-based)
    col_map = {name: i for i, name in enumerate(headers, 1) if name}
    
    rows = list(sheet.iter_rows(min_row=2, values_only=True))
    total_questions = len(rows)
    print(f"Found {total_questions} questions in Excel sheet.")
    
    success_inserts = 0
    errors = 0
    
    # Clear existing PYQs first to avoid duplicates/stale data (and rebuild final database)
    print("Clearing existing rows in pyqs table...")
    supabase.table("pyqs").delete().neq("id", "00000000-0000-0000-0000-000000000000").execute()
    print("pyqs table cleared successfully.")
    
    print("Starting processing and inserts...")
    
    # Base URL for public supabase storage objects
    supabase_url = os.getenv("SUPABASE_URL")
    storage_base_url = f"{supabase_url}/storage/v1/object/public/{STORAGE_BUCKET}"
    
    for idx, row in enumerate(rows, 1):
        try:
            # Helper to get value dynamically using mapping
            def val(col_name):
                col_idx = col_map.get(col_name)
                if col_idx is None:
                    return None
                return row[col_idx - 1]
                
            year = val("Year")
            exam_name = val("Exam Name")
            shift = val("Shift / Session")
            subject = val("Subject")
            q_num = val("Question Number")
            q_text = val("Question Text")
            opt_a = val("Option A")
            opt_b = val("Option B")
            opt_c = val("Option C")
            opt_d = val("Option D")
            opt_e = val("Option E (if available)")
            correct_ans = val("Correct Answer")
            explanation = val("Explanation")
            img_file = val("Image File Name")
            
            if not q_text or not str(q_text).strip():
                print(f"  [SKIP] Row {idx+1}: Empty question text.")
                continue
                
            q_text = str(q_text).strip()
            
            # 1. Classify Topic
            topic_name = classify_question(q_text)
            topic_id = topic_map.get(topic_name)
            if not topic_id:
                # Fallback to first topic if match failed in db map
                topic_name = list(topic_map.keys())[0]
                topic_id = topic_map[topic_name]
                
            # 2. Construct Options
            options = {
                "A": clean_option(opt_a),
                "B": clean_option(opt_b),
                "C": clean_option(opt_c),
                "D": clean_option(opt_d)
            }
            if opt_e:
                options["E"] = clean_option(opt_e)
                
            # 3. Clean Correct Answer
            answer_key = clean_answer_key(correct_ans)
            
            # 4. Format Image URL inside Question Text
            if img_file:
                # Excel cell might contain multiple files separated by comma or semicolon
                img_filenames = [f.strip() for f in str(img_file).replace(";", ",").split(",") if f.strip()]
                img_markdowns = []
                for fname in img_filenames:
                    img_url = f"{storage_base_url}/pyq_images/{fname}"
                    img_markdowns.append(f"\n\n![diagram]({img_url})")
                q_text += "".join(img_markdowns)
                
            # 5. Normalizing Year
            try:
                year_int = int(float(str(year))) if year else 2024
            except ValueError:
                year_int = 2024
                
            # 6. Database Insert payload
            payload = {
                "subject_id": subject_id,
                "topic_id": topic_id,
                "question_text": q_text,
                "question_type": "multiple_choice",
                "options": options,
                "answer_key": answer_key,
                "solution": str(explanation).strip() if explanation else "No explanation available.",
                "year": year_int,
                "marks": 2
            }
            
            # Insert into Supabase
            supabase.table("pyqs").insert(payload).execute()
            success_inserts += 1
            
            if idx % 50 == 0:
                print(f"Processed {idx}/{total_questions} questions. Successful inserts: {success_inserts}")
                # Brief sleep to avoid rate limits
                time.sleep(0.5)
                
        except Exception as e:
            print(f"  [ERROR] Row {idx+1} failed: {e}")
            errors += 1
            
    print("\n==============================================")
    print("MIGRATION COMPLETED")
    print("==============================================")
    print(f"Total Rows Evaluated: {total_questions}")
    print(f"Successfully Inserted: {success_inserts}")
    print(f"Errors/Failed Rows: {errors}")

if __name__ == "__main__":
    migrate()
