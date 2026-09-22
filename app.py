import hashlib
from flask import Flask, render_template, request, jsonify

app = Flask(__name__)

# ---------------------------------------------------------
# "LOVE LAB" ANALYSIS ENGINE
# Deterministic pseudo-numerology: same pair of inputs always
# produces the same result (order-independent), so results are
# shareable/comparable and feel "scientific" rather than random.
# ---------------------------------------------------------

ZODIAC_VIBES = [
    "Fire meets Ice \u2744\ufe0f\ud83d\udd25", "Chaos Duo \ud83c\udfa2", "Slow Burn Romance \ud83d\udd6f\ufe0f",
    "Chai & Overthinking \u2615", "Main Character Energy \u2728", "Opposites Attract \ud83e\uddf2",
    "Best Friends First \ud83e\udd1d", "Rom-Com Plot \ud83c\udfac", "Silent but Deadly Loyal \ud83d\udee1\ufe0f",
    "Unstoppable Force \ud83d\ude80", "Cosmic Coincidence \ud83c\udf20", "Comfort & Chaos \ud83e\udde1",
]

VERDICTS = [
    (90, "Soulmates. Certified.", "Scientists are speechless. Update your bio to 'taken' immediately."),
    (75, "Power Couple Energy", "This is Insta-official material. Post the reel already."),
    (55, "Solid Potential", "Good bones here, thoda communication pe kaam karlo."),
    (35, "It's Complicated\u2122", "Could go either way. Proceed with snacks and patience."),
    (15, "Just Friends, Probably", "The lab suggests keeping this strictly in the group chat."),
    (0,  "Abort Mission", "Sir/Ma'am please. Run. The data has spoken."),
]


def _reduce(n: int) -> int:
    """Reduce a number to a single digit, keeping master numbers 11/22/33."""
    while n > 9 and n not in (11, 22, 33):
        n = sum(int(d) for d in str(n))
    return n


def _life_path(dob: str) -> int:
    digits = "".join(ch for ch in dob if ch.isdigit())
    if not digits:
        digits = "1"
    return _reduce(sum(int(d) for d in digits))


def _name_number(name: str) -> int:
    total = sum((ord(c.upper()) - 64) for c in name if c.isalpha())
    if total == 0:
        total = 7
    return _reduce(total)


def _hash_score(*parts: str, salt: str = "") -> int:
    key = "|".join(parts) + "|" + salt
    digest = hashlib.md5(key.encode("utf-8")).hexdigest()
    return int(digest[:8], 16) % 101


def _clip(n: int, lo: int = 4, hi: int = 99) -> int:
    return max(lo, min(hi, n))


def analyze(name1: str, dob1: str, name2: str, dob2: str) -> dict:
    # Order-independent: sort so "A & B" gives the same result as "B & A"
    pair = sorted([(name1.strip(), dob1.strip()), (name2.strip(), dob2.strip())])
    (n1, d1), (n2, d2) = pair

    lp1, lp2 = _life_path(d1), _life_path(d2)
    nn1, nn2 = _name_number(n1), _name_number(n2)

    life_path_synergy = _clip(100 - abs(lp1 - lp2) * 8, 0, 100)
    name_synergy = _clip(100 - abs(nn1 - nn2) * 7, 0, 100)
    base_hash = _hash_score(n1, n2, d1, d2, salt="overall")

    overall = _clip(round(0.35 * base_hash + 0.35 * life_path_synergy + 0.30 * name_synergy))

    communication = _clip(_hash_score(n1, n2, d1, d2, salt="comm") // 1 * 0 +
                           round(0.5 * _hash_score(n1, d2, salt="comm2") + 0.5 * name_synergy))
    chaos = _clip(_hash_score(n2, d1, salt="chaos"))
    spice = _clip(round(0.6 * _hash_score(n1, n2, salt="spice") + 0.4 * life_path_synergy))
    long_term = _clip(round(0.5 * overall + 0.5 * _hash_score(d1, d2, salt="longterm")))

    month_sum = (int(d1[5:7]) if len(d1) >= 7 and d1[5:7].isdigit() else 1) + \
                (int(d2[5:7]) if len(d2) >= 7 and d2[5:7].isdigit() else 1)
    zodiac_vibe = ZODIAC_VIBES[month_sum % len(ZODIAC_VIBES)]

    verdict_title, verdict_line = "", ""
    for threshold, title, line in VERDICTS:
        if overall >= threshold:
            verdict_title, verdict_line = title, line
            break

    return {
        "name1": name1.strip(),
        "name2": name2.strip(),
        "overall": overall,
        "communication": communication,
        "chaos": chaos,
        "spice": spice,
        "long_term": long_term,
        "life_path_1": lp1,
        "life_path_2": lp2,
        "name_number_1": nn1,
        "name_number_2": nn2,
        "zodiac_vibe": zodiac_vibe,
        "verdict_title": verdict_title,
        "verdict_line": verdict_line,
    }


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/analyze", methods=["POST"])
def api_analyze():
    data = request.get_json(force=True, silent=True) or {}
    name1 = (data.get("name1") or "").strip()
    dob1 = (data.get("dob1") or "").strip()
    name2 = (data.get("name2") or "").strip()
    dob2 = (data.get("dob2") or "").strip()

    if not name1 or not name2 or not dob1 or not dob2:
        return jsonify({"error": "Saare fields bharo pehle!"}), 400

    result = analyze(name1, dob1, name2, dob2)
    return jsonify(result)


if __name__ == "__main__":
    app.run(debug=False, port=5103)