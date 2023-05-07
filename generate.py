from more_itertools import windowed
from itertools import chain
from glob import iglob
import lxml.etree as ET
import lxml.html as HTML
from json import load
from datetime import datetime
from math import floor, ceil
import logging
import os

def converter(speed, coefficient, distance, rounding=""):
    if speed < 0:
        return

    baseline = 0

    for value in coefficient:
        if value < 1:
            baseline = value
        elif speed <= value:
            break

    if rounding == "ceil-s":
        return ceil(baseline * (distance / speed) * 3600) / 60
    if rounding == "ceil-m":
        return ceil(baseline * (distance / speed) * 60)
    if rounding == "ceil-h":
        return ceil(baseline * (distance / speed)) * 60

    if rounding == "floor-s":
        return floor(baseline * (distance / speed) * 3600) / 60
    if rounding == "floor-m":
        return floor(baseline * (distance / speed) * 60)
    if rounding == "floor-h":
        return floor(baseline * (distance / speed)) * 60

    if rounding == "round-s":
        return round(baseline * (distance / speed) * 3600) / 60
    if rounding == "round-m":
        return round(baseline * (distance / speed) * 60)
    if rounding == "round-h":
        return round(baseline * (distance / speed)) * 60

    return baseline * (distance / speed) * 60

def timeformat(time, hours = True, minutes = True, seconds = True):
    result = ""
    if hours:
        result += f"{(floor(time/60))}h"
    if minutes:
        if not hours:
            result += f"{(floor(time)):02d}'"
        else:
            result += f"{(floor(time) % 60):02d}'"
    if seconds:
        result += f"{(floor(time * 60) % 60):02d}\""
    return result
    
def year_roman(year: int = 0) -> str:
    if year <= 0:
        year = datetime.now().year
    result = ""
    while year >= 1000:
        year -= 1000
        result += "M"
    if year >= 900:
        year -= 900
        result += "CM"
    if year >= 500:
        year -= 500
        result += "D"
    if year >= 400:
        year -= 400
        result += "CD"
    while year >= 100:
        year -= 100
        result += "C"
    if year >= 90:
        year -= 90
        result += "XC"
    if year >= 50:
        year -= 50
        result += "L"
    if year >= 40:
        year -= 40
        result += "XL"
    while year >= 10:
        year -= 10
        result += "X"
    if year >= 9:
        year -= 9
        result += "IX"
    if year >= 5:
        year -= 5
        result += "V"
    if year >= 4:
        year -= 4
        result += "IV"
    while year >= 1:
        year -= 1
        result += "I"
    return result

allevents = []

for item in iglob('**/top.json', recursive=True):
    if item.startswith("output"):
        continue
    with open(item, 'r') as f:
        toplevel = load(f)


    allevents.extend(toplevel["events"])

    for ep, ec, en in windowed(chain([None], toplevel["events"], [None]), 3):

        subitem = item.replace("top.json", ec[3])

        with open(subitem, 'r') as f:
            current = load(f)

    
        for p, c, n in windowed(chain([None], current["stages"], [None]), 3):
            data = current["stages"][c]


            with open('stage_template.html', 'r') as f:
                working = f.read()
            
            replacements = {
                "EVENT_TITLE": current["title"],
                "STAGE_ID": c,
                "STAGE_TITLE": data["title"],
                "STAGE_DATE": data["date"],
                "STAGE_LENGTH": data["length"],
                "STAGE_TYPE": data["type"],
                "STAGE_COEFFICIENT_LIST": current["coefficients"][1][data["coefficient"]][0],
                "STAGE_COEFFICIENT": data["coefficient"],
                "EVENT_ROUNDING": current["coefficients"][0],
                "STAGE_RANGE": current["coefficients"][1][data["coefficient"]][1],
                "CURRENT_YEAR": year_roman(),
                "FINAL_TIME": data["final"] or "false"
            }

            if "range" in data:
                replacements["STAGE_RANGE"] = data["range"]

            for k, v in replacements.items():
                working = working.replace(k, str(v))


            try:
                working = HTML.fromstring(working)
            except:
                logging.error(working)
                raise

            stagelinks = working.findall(".//h3/a")

            if p:
                stagelinks[0].attrib["href"] = f"./{p}"
                stagelinks[0].attrib["title"] = f'Stage {p}: {current["stages"][p]["title"]}'
            else:
                stagelinks[0].attrib["disabled"] = ""

            if n:
                stagelinks[1].attrib["href"] = f"./{n}"
                stagelinks[1].attrib["title"] = f'Stage {n}: {current["stages"][n]["title"]}'
            else:
                stagelinks[1].attrib["disabled"] = ""

            table = working.find(".//table")

            header = table.find("thead")

            for i, speed in enumerate(data["speeds"]):
                
                if data["final"]:
                    outer = ET.SubElement(header, "th", {"class": "small"}).text = f"{speed} km/h"
                else:
                    outer = ET.SubElement(header, "th").text = f"{speed} km/h"


            if data["final"]:
                finalminutes = data["final"][0] * 60 + data["final"][1] + data["final"][2] / 60
                finalspeed = (data["length"] / (finalminutes / 60))
                ET.SubElement(header, "th", {"class": "final"}).text = f"{finalspeed:.1f} km/h"

            for j, waypoint in enumerate(data["waypoints"]):

                if j and data["waypoints"][j-1][1] > waypoint[1]:
                    logging.error(f"SANITY CHECK: {subitem} Stage {c}: Waypoint {j} before waypoint {j-1}.")

                if j-1 == len(data["waypoints"]) and waypoint[1] != data["length"]:
                    logging.error(f"SANITY CHECK: {subitem} Stage {c}: Final waypoint doesn't match length.")

                row = ET.SubElement(table, "tr")

                icon = ET.SubElement(row, "td")

                if len(waypoint) > 2:
                    ET.SubElement(icon, "object", {"data": f"/sprites/{waypoint[2]}.svg"})

                name = ET.SubElement(row, "td")

                for i, l in enumerate(waypoint[0].split("<br>")):
                    if not i:
                        name.text = l
                    else:
                        ET.SubElement(name, "br").tail = l

                dist = ET.SubElement(row, "td")

                dist.text = f"{waypoint[1]:.1f}"

                ET.SubElement(dist, "br").tail = f"{(data['length'] - waypoint[1]):.1f}"

                for i, speed in enumerate(data["speeds"]):
                    if data["final"]:
                        outer = ET.SubElement(row, "td", {"class": "small"})
                    else:
                        outer = ET.SubElement(row, "td")
                    outer.text = timeformat((waypoint[1]/speed)*60)
                    ET.SubElement(outer, "br").tail = f"+ {timeformat(converter(speed,replacements['STAGE_COEFFICIENT_LIST'], data['length'], current['coefficients'][0]) * (waypoint[1]/data['length']), False)}"

                if data["final"]:
                    outer = ET.SubElement(row, "td", {"class": "final"})
                    outer.text = timeformat((waypoint[1]/finalspeed)*60)
                    ET.SubElement(outer, "br").tail = f"+ {timeformat(converter(finalspeed,replacements['STAGE_COEFFICIENT_LIST'], data['length'], current['coefficients'][0]) * (waypoint[1]/data['length']), False)}"

            filename = 'output/' + subitem.replace('.json', f'/{c}.html')
            os.makedirs(os.path.dirname(filename), exist_ok=True)

            output = HTML.tostring(working, method="html", encoding="unicode", doctype="<!DOCTYPE html>")

            with open(filename, 'w') as f:
                f.write(output)
