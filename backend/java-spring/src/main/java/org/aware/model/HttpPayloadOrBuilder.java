// Generated by the protocol buffer compiler.  DO NOT EDIT!
// source: model.proto

package org.aware.model;

public interface HttpPayloadOrBuilder extends
    // @@protoc_insertion_point(interface_extends:org.aware.model.HttpPayload)
    com.google.protobuf.MessageOrBuilder {

  /**
   * <code>map&lt;string, string&gt; header_map = 1;</code>
   */
  int getHeaderMapCount();
  /**
   * <code>map&lt;string, string&gt; header_map = 1;</code>
   */
  boolean containsHeaderMap(
      java.lang.String key);
  /**
   * Use {@link #getHeaderMapMap()} instead.
   */
  @java.lang.Deprecated
  java.util.Map<java.lang.String, java.lang.String>
  getHeaderMap();
  /**
   * <code>map&lt;string, string&gt; header_map = 1;</code>
   */
  java.util.Map<java.lang.String, java.lang.String>
  getHeaderMapMap();
  /**
   * <code>map&lt;string, string&gt; header_map = 1;</code>
   */

  /* nullable */
java.lang.String getHeaderMapOrDefault(
      java.lang.String key,
      /* nullable */
java.lang.String defaultValue);
  /**
   * <code>map&lt;string, string&gt; header_map = 1;</code>
   */

  java.lang.String getHeaderMapOrThrow(
      java.lang.String key);

  /**
   * <code>string http_method = 3;</code>
   * @return The httpMethod.
   */
  java.lang.String getHttpMethod();
  /**
   * <code>string http_method = 3;</code>
   * @return The bytes for httpMethod.
   */
  com.google.protobuf.ByteString
      getHttpMethodBytes();

  /**
   * <code>string json_body = 2;</code>
   * @return Whether the jsonBody field is set.
   */
  boolean hasJsonBody();
  /**
   * <code>string json_body = 2;</code>
   * @return The jsonBody.
   */
  java.lang.String getJsonBody();
  /**
   * <code>string json_body = 2;</code>
   * @return The bytes for jsonBody.
   */
  com.google.protobuf.ByteString
      getJsonBodyBytes();

  /**
   * <code>.org.aware.model.HttpGetBody http_get_body = 4;</code>
   * @return Whether the httpGetBody field is set.
   */
  boolean hasHttpGetBody();
  /**
   * <code>.org.aware.model.HttpGetBody http_get_body = 4;</code>
   * @return The httpGetBody.
   */
  org.aware.model.HttpGetBody getHttpGetBody();
  /**
   * <code>.org.aware.model.HttpGetBody http_get_body = 4;</code>
   */
  org.aware.model.HttpGetBodyOrBuilder getHttpGetBodyOrBuilder();

  /**
   * <code>string text_body = 5;</code>
   * @return Whether the textBody field is set.
   */
  boolean hasTextBody();
  /**
   * <code>string text_body = 5;</code>
   * @return The textBody.
   */
  java.lang.String getTextBody();
  /**
   * <code>string text_body = 5;</code>
   * @return The bytes for textBody.
   */
  com.google.protobuf.ByteString
      getTextBodyBytes();

  /**
   * <code>string html_body = 6;</code>
   * @return Whether the htmlBody field is set.
   */
  boolean hasHtmlBody();
  /**
   * <code>string html_body = 6;</code>
   * @return The htmlBody.
   */
  java.lang.String getHtmlBody();
  /**
   * <code>string html_body = 6;</code>
   * @return The bytes for htmlBody.
   */
  com.google.protobuf.ByteString
      getHtmlBodyBytes();

  /**
   * <code>string xml_body = 7;</code>
   * @return Whether the xmlBody field is set.
   */
  boolean hasXmlBody();
  /**
   * <code>string xml_body = 7;</code>
   * @return The xmlBody.
   */
  java.lang.String getXmlBody();
  /**
   * <code>string xml_body = 7;</code>
   * @return The bytes for xmlBody.
   */
  com.google.protobuf.ByteString
      getXmlBodyBytes();

  /**
   * <code>.org.aware.model.HttpFormDataBody http_form_data_body = 8;</code>
   * @return Whether the httpFormDataBody field is set.
   */
  boolean hasHttpFormDataBody();
  /**
   * <code>.org.aware.model.HttpFormDataBody http_form_data_body = 8;</code>
   * @return The httpFormDataBody.
   */
  org.aware.model.HttpFormDataBody getHttpFormDataBody();
  /**
   * <code>.org.aware.model.HttpFormDataBody http_form_data_body = 8;</code>
   */
  org.aware.model.HttpFormDataBodyOrBuilder getHttpFormDataBodyOrBuilder();

  /**
   * <code>.org.aware.model.BinaryDataBody binary_data_body = 9;</code>
   * @return Whether the binaryDataBody field is set.
   */
  boolean hasBinaryDataBody();
  /**
   * <code>.org.aware.model.BinaryDataBody binary_data_body = 9;</code>
   * @return The binaryDataBody.
   */
  org.aware.model.BinaryDataBody getBinaryDataBody();
  /**
   * <code>.org.aware.model.BinaryDataBody binary_data_body = 9;</code>
   */
  org.aware.model.BinaryDataBodyOrBuilder getBinaryDataBodyOrBuilder();

  public org.aware.model.HttpPayload.BodyCase getBodyCase();
}
