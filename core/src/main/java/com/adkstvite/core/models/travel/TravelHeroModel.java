package com.adkstvite.core.models.travel;

import org.apache.sling.api.resource.Resource;
import org.apache.sling.models.annotations.DefaultInjectionStrategy;
import org.apache.sling.models.annotations.Model;
import org.apache.sling.models.annotations.injectorspecific.ValueMapValue;

@Model(adaptables = Resource.class, defaultInjectionStrategy = DefaultInjectionStrategy.OPTIONAL)
public class TravelHeroModel {

    @ValueMapValue
    private String heroImage;
    @ValueMapValue
    private String badgeText;
    @ValueMapValue
    private String headline;
    @ValueMapValue
    private String headlineAccent;
    @ValueMapValue
    private String subheadline;
    @ValueMapValue
    private String cta1Label;
    @ValueMapValue
    private String cta1Href;
    @ValueMapValue
    private String cta2Label;
    @ValueMapValue
    private String cta2Href;

    public String getHeroImage() {
        return heroImage != null ? heroImage
                : "/content/dam/wknd-shared/en/adventures/ski-touring-mont-blanc/adobestock-238230356.jpeg";
    }

    public String getBadgeText() {
        return badgeText != null ? badgeText : "Explore the world";
    }

    public String getHeadline() {
        return headline != null ? headline : "Discover Your";
    }

    public String getHeadlineAccent() {
        return headlineAccent != null ? headlineAccent : "Next Adventure";
    }

    public String getSubheadline() {
        return subheadline != null ? subheadline
                : "From arctic waves to alpine peaks, we connect adventurers with the world's most extraordinary destinations — curated experiences, expert guides, unforgettable memories.";
    }

    public String getCta1Label() {
        return cta1Label != null ? cta1Label : "Explore Destinations";
    }

    public String getCta1Href() {
        return cta1Href != null ? cta1Href : "/content/adkstvite/us/en/about-us.html";
    }

    public String getCta2Label() {
        return cta2Label != null ? cta2Label : "Join for Free";
    }

    public String getCta2Href() {
        return cta2Href != null ? cta2Href : "/content/adkstvite/us/en/register.html";
    }
}
