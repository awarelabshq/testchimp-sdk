// Generated by the protocol buffer compiler.  DO NOT EDIT!
// source: model.proto

package org.testchimp.model;

public final class Model {
  private Model() {}
  public static void registerAllExtensions(
      com.google.protobuf.ExtensionRegistryLite registry) {
  }

  public static void registerAllExtensions(
      com.google.protobuf.ExtensionRegistry registry) {
    registerAllExtensions(
        (com.google.protobuf.ExtensionRegistryLite) registry);
  }
  static final com.google.protobuf.Descriptors.Descriptor
    internal_static_org_testchimp_model_HttpPayload_descriptor;
  static final 
    com.google.protobuf.GeneratedMessageV3.FieldAccessorTable
      internal_static_org_testchimp_model_HttpPayload_fieldAccessorTable;
  static final com.google.protobuf.Descriptors.Descriptor
    internal_static_org_testchimp_model_HttpPayload_HeaderMapEntry_descriptor;
  static final 
    com.google.protobuf.GeneratedMessageV3.FieldAccessorTable
      internal_static_org_testchimp_model_HttpPayload_HeaderMapEntry_fieldAccessorTable;
  static final com.google.protobuf.Descriptors.Descriptor
    internal_static_org_testchimp_model_HttpPayload_QueryParamMapEntry_descriptor;
  static final 
    com.google.protobuf.GeneratedMessageV3.FieldAccessorTable
      internal_static_org_testchimp_model_HttpPayload_QueryParamMapEntry_fieldAccessorTable;
  static final com.google.protobuf.Descriptors.Descriptor
    internal_static_org_testchimp_model_HttpGetBody_descriptor;
  static final 
    com.google.protobuf.GeneratedMessageV3.FieldAccessorTable
      internal_static_org_testchimp_model_HttpGetBody_fieldAccessorTable;
  static final com.google.protobuf.Descriptors.Descriptor
    internal_static_org_testchimp_model_HttpGetBody_KeyValueMapEntry_descriptor;
  static final 
    com.google.protobuf.GeneratedMessageV3.FieldAccessorTable
      internal_static_org_testchimp_model_HttpGetBody_KeyValueMapEntry_fieldAccessorTable;
  static final com.google.protobuf.Descriptors.Descriptor
    internal_static_org_testchimp_model_HttpFormDataBody_descriptor;
  static final 
    com.google.protobuf.GeneratedMessageV3.FieldAccessorTable
      internal_static_org_testchimp_model_HttpFormDataBody_fieldAccessorTable;
  static final com.google.protobuf.Descriptors.Descriptor
    internal_static_org_testchimp_model_HttpFormDataBody_KeyValueMapEntry_descriptor;
  static final 
    com.google.protobuf.GeneratedMessageV3.FieldAccessorTable
      internal_static_org_testchimp_model_HttpFormDataBody_KeyValueMapEntry_fieldAccessorTable;
  static final com.google.protobuf.Descriptors.Descriptor
    internal_static_org_testchimp_model_HttpFormUrlencodedBody_descriptor;
  static final 
    com.google.protobuf.GeneratedMessageV3.FieldAccessorTable
      internal_static_org_testchimp_model_HttpFormUrlencodedBody_fieldAccessorTable;
  static final com.google.protobuf.Descriptors.Descriptor
    internal_static_org_testchimp_model_HttpFormUrlencodedBody_KeyValueMapEntry_descriptor;
  static final 
    com.google.protobuf.GeneratedMessageV3.FieldAccessorTable
      internal_static_org_testchimp_model_HttpFormUrlencodedBody_KeyValueMapEntry_fieldAccessorTable;
  static final com.google.protobuf.Descriptors.Descriptor
    internal_static_org_testchimp_model_BinaryDataBody_descriptor;
  static final 
    com.google.protobuf.GeneratedMessageV3.FieldAccessorTable
      internal_static_org_testchimp_model_BinaryDataBody_fieldAccessorTable;
  static final com.google.protobuf.Descriptors.Descriptor
    internal_static_org_testchimp_model_Payload_descriptor;
  static final 
    com.google.protobuf.GeneratedMessageV3.FieldAccessorTable
      internal_static_org_testchimp_model_Payload_fieldAccessorTable;
  static final com.google.protobuf.Descriptors.Descriptor
    internal_static_org_testchimp_model_PayloadList_descriptor;
  static final 
    com.google.protobuf.GeneratedMessageV3.FieldAccessorTable
      internal_static_org_testchimp_model_PayloadList_fieldAccessorTable;
  static final com.google.protobuf.Descriptors.Descriptor
    internal_static_org_testchimp_model_InsertClientRecordedPayloadRequest_descriptor;
  static final 
    com.google.protobuf.GeneratedMessageV3.FieldAccessorTable
      internal_static_org_testchimp_model_InsertClientRecordedPayloadRequest_fieldAccessorTable;

  public static com.google.protobuf.Descriptors.FileDescriptor
      getDescriptor() {
    return descriptor;
  }
  private static  com.google.protobuf.Descriptors.FileDescriptor
      descriptor;
  static {
    java.lang.String[] descriptorData = {
      "\n\013model.proto\022\023org.testchimp.model\"\323\005\n\013H" +
      "ttpPayload\022C\n\nheader_map\030\001 \003(\0132/.org.tes" +
      "tchimp.model.HttpPayload.HeaderMapEntry\022" +
      "L\n\017query_param_map\030\r \003(\01323.org.testchimp" +
      ".model.HttpPayload.QueryParamMapEntry\022\030\n" +
      "\013http_method\030\003 \001(\tH\001\210\001\001\022\032\n\rresponse_code" +
      "\030\014 \001(\005H\002\210\001\001\022\023\n\tjson_body\030\002 \001(\tH\000\022=\n\rhttp" +
      "_get_body\030\004 \001(\0132 .org.testchimp.model.Ht" +
      "tpGetBodyB\002\030\001H\000\022\023\n\ttext_body\030\005 \001(\tH\000\022\023\n\t" +
      "html_body\030\006 \001(\tH\000\022\022\n\010xml_body\030\007 \001(\tH\000\022D\n" +
      "\023http_form_data_body\030\010 \001(\0132%.org.testchi" +
      "mp.model.HttpFormDataBodyH\000\022P\n\031http_form" +
      "_urlencoded_body\030\013 \001(\0132+.org.testchimp.m" +
      "odel.HttpFormUrlencodedBodyH\000\022?\n\020binary_" +
      "data_body\030\t \001(\0132#.org.testchimp.model.Bi" +
      "naryDataBodyH\000\0320\n\016HeaderMapEntry\022\013\n\003key\030" +
      "\001 \001(\t\022\r\n\005value\030\002 \001(\t:\0028\001\0324\n\022QueryParamMa" +
      "pEntry\022\013\n\003key\030\001 \001(\t\022\r\n\005value\030\002 \001(\t:\0028\001B\006" +
      "\n\004bodyB\016\n\014_http_methodB\020\n\016_response_code" +
      "\"\213\001\n\013HttpGetBody\022H\n\rkey_value_map\030\001 \003(\0132" +
      "1.org.testchimp.model.HttpGetBody.KeyVal" +
      "ueMapEntry\0322\n\020KeyValueMapEntry\022\013\n\003key\030\001 " +
      "\001(\t\022\r\n\005value\030\002 \001(\t:\0028\001\"\225\001\n\020HttpFormDataB" +
      "ody\022M\n\rkey_value_map\030\001 \003(\01326.org.testchi" +
      "mp.model.HttpFormDataBody.KeyValueMapEnt" +
      "ry\0322\n\020KeyValueMapEntry\022\013\n\003key\030\001 \001(\t\022\r\n\005v" +
      "alue\030\002 \001(\t:\0028\001\"\241\001\n\026HttpFormUrlencodedBod" +
      "y\022S\n\rkey_value_map\030\001 \003(\0132<.org.testchimp" +
      ".model.HttpFormUrlencodedBody.KeyValueMa" +
      "pEntry\0322\n\020KeyValueMapEntry\022\013\n\003key\030\001 \001(\t\022" +
      "\r\n\005value\030\002 \001(\t:\0028\001\",\n\016BinaryDataBody\022\021\n\004" +
      "data\030\001 \001(\014H\000\210\001\001B\007\n\005_data\"p\n\007Payload\022\024\n\007s" +
      "pan_id\030\001 \001(\tH\001\210\001\001\0228\n\014http_payload\030\002 \001(\0132" +
      " .org.testchimp.model.HttpPayloadH\000B\t\n\007p" +
      "ayloadB\n\n\010_span_id\"=\n\013PayloadList\022.\n\010pay" +
      "loads\030\001 \003(\0132\034.org.testchimp.model.Payloa" +
      "d\"\340\002\n\"InsertClientRecordedPayloadRequest" +
      "\022:\n\017request_payload\030\001 \001(\0132\034.org.testchim" +
      "p.model.PayloadH\000\210\001\001\022;\n\020response_payload" +
      "\030\002 \001(\0132\034.org.testchimp.model.PayloadH\001\210\001" +
      "\001\022\020\n\003url\030\003 \001(\tH\002\210\001\001\022*\n\035session_recording" +
      "_tracking_id\030\004 \001(\tH\003\210\001\001\022\034\n\017current_user_" +
      "id\030\005 \001(\tH\004\210\001\001B\022\n\020_request_payloadB\023\n\021_re" +
      "sponse_payloadB\006\n\004_urlB \n\036_session_recor" +
      "ding_tracking_idB\022\n\020_current_user_idB\036\n\023" +
      "org.testchimp.modelB\005ModelP\001b\006proto3"
    };
    descriptor = com.google.protobuf.Descriptors.FileDescriptor
      .internalBuildGeneratedFileFrom(descriptorData,
        new com.google.protobuf.Descriptors.FileDescriptor[] {
        });
    internal_static_org_testchimp_model_HttpPayload_descriptor =
      getDescriptor().getMessageTypes().get(0);
    internal_static_org_testchimp_model_HttpPayload_fieldAccessorTable = new
      com.google.protobuf.GeneratedMessageV3.FieldAccessorTable(
        internal_static_org_testchimp_model_HttpPayload_descriptor,
        new java.lang.String[] { "HeaderMap", "QueryParamMap", "HttpMethod", "ResponseCode", "JsonBody", "HttpGetBody", "TextBody", "HtmlBody", "XmlBody", "HttpFormDataBody", "HttpFormUrlencodedBody", "BinaryDataBody", "Body", "HttpMethod", "ResponseCode", });
    internal_static_org_testchimp_model_HttpPayload_HeaderMapEntry_descriptor =
      internal_static_org_testchimp_model_HttpPayload_descriptor.getNestedTypes().get(0);
    internal_static_org_testchimp_model_HttpPayload_HeaderMapEntry_fieldAccessorTable = new
      com.google.protobuf.GeneratedMessageV3.FieldAccessorTable(
        internal_static_org_testchimp_model_HttpPayload_HeaderMapEntry_descriptor,
        new java.lang.String[] { "Key", "Value", });
    internal_static_org_testchimp_model_HttpPayload_QueryParamMapEntry_descriptor =
      internal_static_org_testchimp_model_HttpPayload_descriptor.getNestedTypes().get(1);
    internal_static_org_testchimp_model_HttpPayload_QueryParamMapEntry_fieldAccessorTable = new
      com.google.protobuf.GeneratedMessageV3.FieldAccessorTable(
        internal_static_org_testchimp_model_HttpPayload_QueryParamMapEntry_descriptor,
        new java.lang.String[] { "Key", "Value", });
    internal_static_org_testchimp_model_HttpGetBody_descriptor =
      getDescriptor().getMessageTypes().get(1);
    internal_static_org_testchimp_model_HttpGetBody_fieldAccessorTable = new
      com.google.protobuf.GeneratedMessageV3.FieldAccessorTable(
        internal_static_org_testchimp_model_HttpGetBody_descriptor,
        new java.lang.String[] { "KeyValueMap", });
    internal_static_org_testchimp_model_HttpGetBody_KeyValueMapEntry_descriptor =
      internal_static_org_testchimp_model_HttpGetBody_descriptor.getNestedTypes().get(0);
    internal_static_org_testchimp_model_HttpGetBody_KeyValueMapEntry_fieldAccessorTable = new
      com.google.protobuf.GeneratedMessageV3.FieldAccessorTable(
        internal_static_org_testchimp_model_HttpGetBody_KeyValueMapEntry_descriptor,
        new java.lang.String[] { "Key", "Value", });
    internal_static_org_testchimp_model_HttpFormDataBody_descriptor =
      getDescriptor().getMessageTypes().get(2);
    internal_static_org_testchimp_model_HttpFormDataBody_fieldAccessorTable = new
      com.google.protobuf.GeneratedMessageV3.FieldAccessorTable(
        internal_static_org_testchimp_model_HttpFormDataBody_descriptor,
        new java.lang.String[] { "KeyValueMap", });
    internal_static_org_testchimp_model_HttpFormDataBody_KeyValueMapEntry_descriptor =
      internal_static_org_testchimp_model_HttpFormDataBody_descriptor.getNestedTypes().get(0);
    internal_static_org_testchimp_model_HttpFormDataBody_KeyValueMapEntry_fieldAccessorTable = new
      com.google.protobuf.GeneratedMessageV3.FieldAccessorTable(
        internal_static_org_testchimp_model_HttpFormDataBody_KeyValueMapEntry_descriptor,
        new java.lang.String[] { "Key", "Value", });
    internal_static_org_testchimp_model_HttpFormUrlencodedBody_descriptor =
      getDescriptor().getMessageTypes().get(3);
    internal_static_org_testchimp_model_HttpFormUrlencodedBody_fieldAccessorTable = new
      com.google.protobuf.GeneratedMessageV3.FieldAccessorTable(
        internal_static_org_testchimp_model_HttpFormUrlencodedBody_descriptor,
        new java.lang.String[] { "KeyValueMap", });
    internal_static_org_testchimp_model_HttpFormUrlencodedBody_KeyValueMapEntry_descriptor =
      internal_static_org_testchimp_model_HttpFormUrlencodedBody_descriptor.getNestedTypes().get(0);
    internal_static_org_testchimp_model_HttpFormUrlencodedBody_KeyValueMapEntry_fieldAccessorTable = new
      com.google.protobuf.GeneratedMessageV3.FieldAccessorTable(
        internal_static_org_testchimp_model_HttpFormUrlencodedBody_KeyValueMapEntry_descriptor,
        new java.lang.String[] { "Key", "Value", });
    internal_static_org_testchimp_model_BinaryDataBody_descriptor =
      getDescriptor().getMessageTypes().get(4);
    internal_static_org_testchimp_model_BinaryDataBody_fieldAccessorTable = new
      com.google.protobuf.GeneratedMessageV3.FieldAccessorTable(
        internal_static_org_testchimp_model_BinaryDataBody_descriptor,
        new java.lang.String[] { "Data", "Data", });
    internal_static_org_testchimp_model_Payload_descriptor =
      getDescriptor().getMessageTypes().get(5);
    internal_static_org_testchimp_model_Payload_fieldAccessorTable = new
      com.google.protobuf.GeneratedMessageV3.FieldAccessorTable(
        internal_static_org_testchimp_model_Payload_descriptor,
        new java.lang.String[] { "SpanId", "HttpPayload", "Payload", "SpanId", });
    internal_static_org_testchimp_model_PayloadList_descriptor =
      getDescriptor().getMessageTypes().get(6);
    internal_static_org_testchimp_model_PayloadList_fieldAccessorTable = new
      com.google.protobuf.GeneratedMessageV3.FieldAccessorTable(
        internal_static_org_testchimp_model_PayloadList_descriptor,
        new java.lang.String[] { "Payloads", });
    internal_static_org_testchimp_model_InsertClientRecordedPayloadRequest_descriptor =
      getDescriptor().getMessageTypes().get(7);
    internal_static_org_testchimp_model_InsertClientRecordedPayloadRequest_fieldAccessorTable = new
      com.google.protobuf.GeneratedMessageV3.FieldAccessorTable(
        internal_static_org_testchimp_model_InsertClientRecordedPayloadRequest_descriptor,
        new java.lang.String[] { "RequestPayload", "ResponsePayload", "Url", "SessionRecordingTrackingId", "CurrentUserId", "RequestPayload", "ResponsePayload", "Url", "SessionRecordingTrackingId", "CurrentUserId", });
  }

  // @@protoc_insertion_point(outer_class_scope)
}
