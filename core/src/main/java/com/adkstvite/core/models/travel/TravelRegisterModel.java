package com.adkstvite.core.models.travel;

import org.apache.sling.api.resource.Resource;
import org.apache.sling.models.annotations.DefaultInjectionStrategy;
import org.apache.sling.models.annotations.Model;
import org.apache.sling.models.annotations.injectorspecific.ValueMapValue;

@Model(adaptables = Resource.class, defaultInjectionStrategy = DefaultInjectionStrategy.OPTIONAL)
public class TravelRegisterModel {

    @ValueMapValue
    private String heading;
    @ValueMapValue
    private String description;

    public String getHeading() {
        return heading != null ? heading : "Create your account";
    }

    public String getDescription() {
        return description != null ? description
                : "Join thousands of adventurers exploring the world with AdventureTrails.";
    }
}
