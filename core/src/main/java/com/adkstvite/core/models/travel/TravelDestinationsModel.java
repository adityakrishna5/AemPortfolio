package com.adkstvite.core.models.travel;

import java.util.ArrayList;
import java.util.Iterator;
import java.util.List;
import javax.annotation.PostConstruct;
import org.apache.sling.api.resource.Resource;
import org.apache.sling.api.resource.ValueMap;
import org.apache.sling.models.annotations.DefaultInjectionStrategy;
import org.apache.sling.models.annotations.Model;
import org.apache.sling.models.annotations.injectorspecific.SlingObject;
import org.apache.sling.models.annotations.injectorspecific.ValueMapValue;

@Model(adaptables = Resource.class, defaultInjectionStrategy = DefaultInjectionStrategy.OPTIONAL)
public class TravelDestinationsModel {

    @SlingObject
    private Resource resource;

    @ValueMapValue
    private String overline;
    @ValueMapValue
    private String heading;
    @ValueMapValue
    private String description;
    @ValueMapValue
    private String exploreTripLabel;

    private String destinationsJson;

    @PostConstruct
    protected void init() {
        List<String> items = new ArrayList<>();
        Resource itemsRes = resource.getChild("items");
        if (itemsRes != null) {
            Iterator<Resource> iter = itemsRes.listChildren();
            while (iter.hasNext()) {
                Resource child = iter.next();
                ValueMap vm = child.getValueMap();
                items.add(buildDestinationJson(
                        vm.get("title", ""),
                        vm.get("location", ""),
                        vm.get("description", ""),
                        vm.get("image", ""),
                        vm.get("href", ""),
                        vm.get("tag", "")));
            }
        }
        if (items.isEmpty()) {
            items.add(buildDestinationJson(
                    "Mont Blanc Ski Touring", "Chamonix, French Alps",
                    "Tackle iconic high-altitude ski routes across the roof of Europe. Glaciers, couloirs, and jaw-dropping panoramas await at every ridge.",
                    "/content/dam/wknd-shared/en/adventures/ski-touring-mont-blanc/adobestock-273139829.jpeg",
                    "/content/adkstvite/us/en/about-us.html", "Alpine"));
            items.add(buildDestinationJson(
                    "Outback River Camp", "Western Australia",
                    "Sleep under a blanket of stars beside ancient rivers. Explore red gorges, swim in crystal rockpools, and hear the wild call of the outback.",
                    "/content/dam/wknd-shared/en/adventures/riverside-camping-australia/adobestock-167833331.jpeg",
                    "/content/adkstvite/us/en/about-us.html", "Wilderness"));
            items.add(buildDestinationJson(
                    "Alpine Summit Trek", "Mont Blanc Massif, Italy",
                    "Multi-day traverse of legendary alpine terrain \u2014 hut-to-hut trails, vertiginous ridgelines, and golden sunsets above the clouds.",
                    "/content/dam/wknd-shared/en/adventures/ski-touring-mont-blanc/adobestock-75620750.jpeg",
                    "/content/adkstvite/us/en/about-us.html", "Trekking"));
        }
        destinationsJson = "[" + String.join(",", items) + "]";
    }

    private static String buildDestinationJson(String title, String location, String desc,
            String image, String href, String tag) {
        return "{\"title\":\"" + esc(title) + "\","
                + "\"location\":\"" + esc(location) + "\","
                + "\"description\":\"" + esc(desc) + "\","
                + "\"image\":\"" + esc(image) + "\","
                + "\"href\":\"" + esc(href) + "\","
                + "\"tag\":\"" + esc(tag) + "\"}";
    }

    private static String esc(String s) {
        if (s == null)
            return "";
        return s.replace("\\", "\\\\").replace("\"", "\\\"")
                .replace("\n", "\\n").replace("\r", "\\r");
    }

    public String getOverline() {
        return overline != null ? overline : "Where to Next";
    }

    public String getHeading() {
        return heading != null ? heading : "Featured Destinations";
    }

    public String getDescription() {
        return description != null ? description
                : "Handpicked expeditions for the bold and the curious \u2014 every destination is vetted by our expert adventure team.";
    }

    public String getDestinationsJson() {
        return destinationsJson;
    }

    public String getExploreTripLabel() {
        return exploreTripLabel != null ? exploreTripLabel : "Explore trip";
    }
}
