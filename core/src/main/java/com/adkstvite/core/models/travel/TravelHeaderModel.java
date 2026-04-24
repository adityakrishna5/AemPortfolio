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
public class TravelHeaderModel {

    @SlingObject
    private Resource resource;

    @ValueMapValue
    private String brandName;
    @ValueMapValue
    private String brandHref;
    @ValueMapValue
    private String signInLabel;
    @ValueMapValue
    private String signInHref;
    @ValueMapValue
    private String registerLabel;
    @ValueMapValue
    private String registerHref;

    private String navItemsJson;

    @PostConstruct
    protected void init() {
        List<String> items = new ArrayList<>();
        Resource navRes = resource.getChild("navItems");
        if (navRes != null) {
            Iterator<Resource> iter = navRes.listChildren();
            while (iter.hasNext()) {
                Resource child = iter.next();
                ValueMap vm = child.getValueMap();
                items.add(buildLinkJson(vm.get("label", ""), vm.get("href", "")));
            }
        }
        if (items.isEmpty()) {
            items.add(buildLinkJson("Home", "/content/adkstvite/us/en/home.html"));
            items.add(buildLinkJson("About Us", "/content/adkstvite/us/en/about-us.html"));
        }
        navItemsJson = "[" + String.join(",", items) + "]";
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

    public String getSignInLabel() {
        return signInLabel != null ? signInLabel : "Sign In";
    }

    public String getSignInHref() {
        return signInHref != null ? signInHref : "/content/adkstvite/us/en/sign-in.html";
    }

    public String getRegisterLabel() {
        return registerLabel != null ? registerLabel : "Register";
    }

    public String getRegisterHref() {
        return registerHref != null ? registerHref : "/content/adkstvite/us/en/register.html";
    }

    public String getNavItemsJson() {
        return navItemsJson;
    }
}
