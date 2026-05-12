package com.adkstvite.core.auth;

import org.osgi.service.metatype.annotations.AttributeDefinition;
import org.osgi.service.metatype.annotations.AttributeType;
import org.osgi.service.metatype.annotations.ObjectClassDefinition;

/**
 * OSGi metatype configuration for the Auth0 proxy.
 * Values are supplied via ui.config
 * osgiconfig/config/com.adkstvite.core.auth.Auth0Config.cfg.json.
 */
@ObjectClassDefinition(name = "AdventureTrails – Auth0 Configuration")
public @interface Auth0Config {

    @AttributeDefinition(name = "Domain", description = "Auth0 domain without scheme, e.g. dev-xxx.auth0.com")
    String domain() default "dev-raxs6tqu8i751qyo.us.auth0.com";

    @AttributeDefinition(name = "Client ID")
    String clientId() default "";

    @AttributeDefinition(name = "Client Secret", type = AttributeType.PASSWORD)
    String clientSecret() default "";

    @AttributeDefinition(name = "API Audience")
    String audience() default "https://adkstvite.api";

    @AttributeDefinition(name = "Database Connection", description = "Auth0 DB connection name")
    String connection() default "Username-Password-Authentication";
}
