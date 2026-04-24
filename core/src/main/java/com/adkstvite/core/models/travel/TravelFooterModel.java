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
public class TravelFooterModel {

    @SlingObject
    private Resource resource;

    @ValueMapValue
    private String brandName;
    @ValueMapValue
    private String brandHref;
    @ValueMapValue
    private String tagline;

    private String quickLinksJson;
    private String topDestinationsJson;

    @PostConstruct
    protected void init() {
        quickLinksJson = buildLinksJson("quickLinks",
                new String[][] {
                        { "Home", "/content/adkstvite/us/en/home.html" },
                        { "About Us", "/content/adkstvite/us/en/about-us.html" },
                        { "Sign In", "/content/adkstvite/us/en/sign-in.html" },
                        { "Register", "/content/adkstvite/us/en/register.html" }
                });
        topDestinationsJson = buildLinksJson("topDestinations",
                new String[][] {
                        { "Arctic Surfing, Norway", "/content/adkstvite/us/en/about-us.html" },
                        { "Svalbard Trekking", "/content/adkstvite/us/en/about-us.html" },
                        { "Iceland Ring Road", "/content/adkstvite/us/en/about-us.html" },
                        { "Scottish Highlands", "/content/adkstvite/us/en/about-us.html" },
                        { "Patagonia Crossing", "/content/adkstvite/us/en/about-us.html" }
                });
    }

    private String buildLinksJson(String childName, String[][] defaults) {
        List<String> items = new ArrayList<>();
        Resource child = resource.getChild(childName);
        if (child != null) {
            Iterator<Resource> iter = child.listChildren();
            while (iter.hasNext()) {
                Resource item = iter.next();
                ValueMap vm = item.getValueMap();
                items.add(buildLinkJson(vm.get("label", ""), vm.get("href", "")));
            }
        }
        if (items.isEmpty()) {
            for (String[] pair : defaults) {
                items.add(buildLinkJson(pair[0], pair[1]));
            }
        }
        return "[" + String.join(",", items) + "]";
    }

    private static String buildLinkJson(String label, String href) {
        return "{\"label\":\"" + esc(label) + "\",\"href\":\"" + esc(href) + "\"}";
    }

    private static String esc(String s) {
        if (s == null)
            return "";
        return s.replace("\\", "\\\\").replace("\"", "\\\"")
                .replace("\n", "\\n").replace("\r", "\\r");
    }

    public String getBrandName() {
        return brandName != null ? brandName : "AdventureTrails";
    }

    public String getBrandHref() {
        return brandHref != null ? brandHref : "/content/adkstvite/us/en/home.html";
    }

    public String getTagline() {
        return tagline != null ? tagline
                : "Connecting adventurers with extraordinary destinations since 2010. Every trip is a story waiting to be written.";
    }

    public String getQuickLinksJson() {
        return quickLinksJson;
    }

    public String getTopDestinationsJson() {
        return topDestinationsJson;
    }
}
