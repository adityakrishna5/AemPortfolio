package com.adkstvite.core.models.travel;

import org.apache.sling.api.resource.Resource;
import org.apache.sling.models.annotations.DefaultInjectionStrategy;
import org.apache.sling.models.annotations.Model;
import org.apache.sling.models.annotations.injectorspecific.ValueMapValue;

@Model(adaptables = Resource.class, defaultInjectionStrategy = DefaultInjectionStrategy.OPTIONAL)
public class TravelTranslationWorkflowModel {

    @ValueMapValue
    private String heading;
    @ValueMapValue
    private String description;

    @ValueMapValue
    private String step1Title;
    @ValueMapValue
    private String step1Desc;
    @ValueMapValue
    private String step2Title;
    @ValueMapValue
    private String step2Desc;
    @ValueMapValue
    private String step3Title;
    @ValueMapValue
    private String step3Desc;
    @ValueMapValue
    private String step4Title;
    @ValueMapValue
    private String step4Desc;

    @ValueMapValue
    private String noteHeading;
    @ValueMapValue
    private String noteBody;

    public String getHeading() {
        return heading != null ? heading : "How AEM Translation Works";
    }

    public String getDescription() {
        return description != null ? description
                : "A look at how content reaches every language across the AdventureTrails platform.";
    }

    public String getStep1Title() {
        return step1Title != null ? step1Title : "Language Copy Creation";
    }

    public String getStep1Desc() {
        return step1Desc != null ? step1Desc
                : "Content authors initiate a language copy in AEM Sites. Page structure is replicated to the target locale path without content.";
    }

    public String getStep2Title() {
        return step2Title != null ? step2Title : "Translation Project";
    }

    public String getStep2Desc() {
        return step2Desc != null ? step2Desc
                : "AEM creates a Translation Project. Content is exported as XLIFF and sent to the connected Translation Management System (TMS).";
    }

    public String getStep3Title() {
        return step3Title != null ? step3Title : "Human Review";
    }

    public String getStep3Desc() {
        return step3Desc != null ? step3Desc
                : "Language experts review machine or human translations inside the TMS, making corrections before approving the job.";
    }

    public String getStep4Title() {
        return step4Title != null ? step4Title : "Approval & Publish";
    }

    public String getStep4Desc() {
        return step4Desc != null ? step4Desc
                : "Approved translations are imported back into AEM, reviewed by content editors, and published live to each locale site.";
    }

    public String getNoteHeading() {
        return noteHeading != null ? noteHeading : "On this prototype";
    }

    public String getNoteBody() {
        return noteBody != null ? noteBody
                : "Because this is a developer prototype, translations are authored directly into the JCR as locale-specific .content.xml files — the same output a real TMS workflow would produce.";
    }
}
