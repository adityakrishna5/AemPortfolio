package com.adkstvite.core.models.travel;

import java.util.ArrayList;
import java.util.Iterator;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import javax.annotation.PostConstruct;
import org.apache.sling.api.SlingHttpServletRequest;
import org.apache.sling.api.resource.Resource;
import org.apache.sling.api.resource.ValueMap;
import org.apache.sling.models.annotations.DefaultInjectionStrategy;
import org.apache.sling.models.annotations.Model;
import org.apache.sling.models.annotations.injectorspecific.SlingObject;
import org.apache.sling.models.annotations.injectorspecific.ValueMapValue;

@Model(adaptables = { SlingHttpServletRequest.class,
        Resource.class }, defaultInjectionStrategy = DefaultInjectionStrategy.OPTIONAL)
public class TravelFooterModel {

    private static final Pattern LOCALE_PATTERN = Pattern.compile("/content/adkstvite/([a-z]{2})/([a-z]{2})/");

    @SlingObject
    private SlingHttpServletRequest request;

    @SlingObject
    private Resource resource;

    @ValueMapValue
    private String brandName;
    @ValueMapValue
    private String brandHref;
    @ValueMapValue
    private String tagline;
    @ValueMapValue
    private String quickLinksHeading;
    @ValueMapValue
    private String topDestinationsHeading;
    @ValueMapValue
    private String newsletterHeading;
    @ValueMapValue
    private String newsletterDescription;
    @ValueMapValue
    private String newsletterButtonLabel;

    private String currentLocale;
    private String quickLinksJson;
    private String topDestinationsJson;

    @PostConstruct
    protected void init() {
        resolveLocale();

        // Use the locale-specific XF footer-mount when available so that translated
        // labels (tagline, quickLinks, topDestinations) are served. The Core XF locale
        // auto-swap is bypassed for the same reason as TravelHeaderModel.
        Resource footerSource = resolveLocaleFooterResource();
        if (footerSource != null) {
            ValueMap vm = footerSource.getValueMap();
            if (vm.containsKey("brandName"))
                brandName = vm.get("brandName", String.class);
            if (vm.containsKey("brandHref"))
                brandHref = vm.get("brandHref", String.class);
            if (vm.containsKey("tagline"))
                tagline = vm.get("tagline", String.class);
            if (vm.containsKey("quickLinksHeading"))
                quickLinksHeading = vm.get("quickLinksHeading", String.class);
            if (vm.containsKey("topDestinationsHeading"))
                topDestinationsHeading = vm.get("topDestinationsHeading", String.class);
            if (vm.containsKey("newsletterHeading"))
                newsletterHeading = vm.get("newsletterHeading", String.class);
            if (vm.containsKey("newsletterDescription"))
                newsletterDescription = vm.get("newsletterDescription", String.class);
            if (vm.containsKey("newsletterButtonLabel"))
                newsletterButtonLabel = vm.get("newsletterButtonLabel", String.class);
        }

        Resource linkSource = (footerSource != null) ? footerSource : resource;
        quickLinksJson = buildLinksJson(linkSource, "quickLinks",
                new String[][] {
                        { "Home", "/content/adkstvite/us/en/home.html" },
                        { "About Us", "/content/adkstvite/us/en/about-us.html" },
                        { "Sign In", "/content/adkstvite/us/en/sign-in.html" },
                        { "Register", "/content/adkstvite/us/en/register.html" }
                });
        topDestinationsJson = buildLinksJson(linkSource, "topDestinations",
                new String[][] {
                        { "Arctic Surfing, Norway", "/content/adkstvite/us/en/about-us.html" },
                        { "Svalbard Trekking", "/content/adkstvite/us/en/about-us.html" },
                        { "Iceland Ring Road", "/content/adkstvite/us/en/about-us.html" },
                        { "Scottish Highlands", "/content/adkstvite/us/en/about-us.html" },
                        { "Patagonia Crossing", "/content/adkstvite/us/en/about-us.html" }
                });
    }

    private void resolveLocale() {
        currentLocale = "us/en";
        if (request != null) {
            Matcher m = LOCALE_PATTERN.matcher(request.getRequestURI());
            if (m.find()) {
                currentLocale = m.group(1) + "/" + m.group(2);
            }
        }
    }

    private Resource resolveLocaleFooterResource() {
        if (resource == null || "us/en".equals(currentLocale)) {
            return null;
        }
        String xfPath = "/content/experience-fragments/adkstvite/"
                + currentLocale + "/site/footer/master/jcr:content/root/footer-mount";
        return resource.getResourceResolver().getResource(xfPath);
    }

    private String buildLinksJson(Resource source, String childName, String[][] defaults) {
        List<String> items = new ArrayList<>();
        Resource child = source.getChild(childName);
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

    public String getQuickLinksHeading() {
        return quickLinksHeading != null ? quickLinksHeading : "Quick Links";
    }

    public String getTopDestinationsHeading() {
        return topDestinationsHeading != null ? topDestinationsHeading : "Top Destinations";
    }

    public String getNewsletterHeading() {
        return newsletterHeading != null ? newsletterHeading : "Stay Connected";
    }

    public String getNewsletterDescription() {
        return newsletterDescription != null ? newsletterDescription
                : "Get expedition updates and travel inspiration in your inbox.";
    }

    public String getNewsletterButtonLabel() {
        return newsletterButtonLabel != null ? newsletterButtonLabel : "Go";
    }
}
