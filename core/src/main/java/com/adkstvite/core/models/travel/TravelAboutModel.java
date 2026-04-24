package com.adkstvite.core.models.travel;

import org.apache.sling.api.resource.Resource;
import org.apache.sling.models.annotations.DefaultInjectionStrategy;
import org.apache.sling.models.annotations.Model;
import org.apache.sling.models.annotations.injectorspecific.ValueMapValue;

@Model(adaptables = Resource.class, defaultInjectionStrategy = DefaultInjectionStrategy.OPTIONAL)
public class TravelAboutModel {

    @ValueMapValue
    private String aboutImage;
    @ValueMapValue
    private String overline;
    @ValueMapValue
    private String headline;
    @ValueMapValue
    private String headlineAccent;
    @ValueMapValue
    private String para1;
    @ValueMapValue
    private String para2;
    @ValueMapValue
    private String stat1Value;
    @ValueMapValue
    private String stat1Label;
    @ValueMapValue
    private String stat2Value;
    @ValueMapValue
    private String stat2Label;
    @ValueMapValue
    private String stat3Value;
    @ValueMapValue
    private String stat3Label;
    @ValueMapValue
    private String stat4Value;
    @ValueMapValue
    private String stat4Label;
    @ValueMapValue
    private String ctaLabel;
    @ValueMapValue
    private String ctaHref;

    public String getAboutImage() {
        return aboutImage != null ? aboutImage
                : "/content/dam/wknd-shared/en/adventures/ski-touring-mont-blanc/adobestock-222643220.jpeg";
    }

    public String getOverline() {
        return overline != null ? overline : "Who We Are";
    }

    public String getHeadline() {
        return headline != null ? headline : "We Live to Explore";
    }

    public String getHeadlineAccent() {
        return headlineAccent != null ? headlineAccent : "the World";
    }

    public String getPara1() {
        return para1 != null ? para1
                : "AdventureTrails was founded by a group of passionate explorers who believed that travel should be transformative \u2014 not just a vacation, but a life-changing experience. We specialize in curating small-group expeditions to destinations that most travellers only dream about.";
    }

    public String getPara2() {
        return para2 != null ? para2
                : "Whether you\u2019re chasing arctic waves, scaling volcanic peaks, or trekking through ancient rain forests, our expert local guides ensure every journey is safe, sustainable, and genuinely unforgettable.";
    }

    public String getStat1Value() {
        return stat1Value != null ? stat1Value : "60+";
    }

    public String getStat1Label() {
        return stat1Label != null ? stat1Label : "Countries";
    }

    public String getStat2Value() {
        return stat2Value != null ? stat2Value : "200+";
    }

    public String getStat2Label() {
        return stat2Label != null ? stat2Label : "Expeditions Yearly";
    }

    public String getStat3Value() {
        return stat3Value != null ? stat3Value : "50K+";
    }

    public String getStat3Label() {
        return stat3Label != null ? stat3Label : "Happy Travellers";
    }

    public String getStat4Value() {
        return stat4Value != null ? stat4Value : "15";
    }

    public String getStat4Label() {
        return stat4Label != null ? stat4Label : "Years of Experience";
    }

    public String getCtaLabel() {
        return ctaLabel != null ? ctaLabel : "Our Story";
    }

    public String getCtaHref() {
        return ctaHref != null ? ctaHref : "/content/adkstvite/us/en/about-us.html";
    }
}
